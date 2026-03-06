import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type WrapperCase = {
  mockName: string;
  mockSymbol: string;
  wrapperContract: "ConfidentialUSDC" | "ConfidentialUSDT";
  wrapperSymbol: "cUSDC" | "cUSDT";
  wrapperName: string;
};

async function deployWrapperCase(c: WrapperCase) {
  const [deployer, alice, bob] = await ethers.getSigners();

  const mockFactory = await ethers.getContractFactory("MockERC20");
  const mock = await mockFactory.deploy(
    c.mockName,
    c.mockSymbol,
    ethers.parseUnits("1000000", 6),
    6,
    deployer.address
  );
  await mock.waitForDeployment();

  const wrapperFactory = await ethers.getContractFactory(c.wrapperContract);
  const wrapper = await wrapperFactory.deploy(await mock.getAddress());
  await wrapper.waitForDeployment();

  await mock.connect(deployer).transfer(alice.address, ethers.parseUnits("1000", 6));

  return { deployer, alice, bob, mock, wrapper };
}

const cases: WrapperCase[] = [
  {
    mockName: "USD Coin",
    mockSymbol: "USDC",
    wrapperContract: "ConfidentialUSDC",
    wrapperSymbol: "cUSDC",
    wrapperName: "Confidential USDC",
  },
  {
    mockName: "Tether USD",
    mockSymbol: "USDT",
    wrapperContract: "ConfidentialUSDT",
    wrapperSymbol: "cUSDT",
    wrapperName: "Confidential USDT",
  },
];

for (const c of cases) {
  describe(`${c.wrapperContract} wrapper`, function () {
    beforeEach(function () {
      if (!fhevm.isMock) {
        this.skip();
      }
    });

    it("deploys with expected metadata and underlying", async function () {
      const { mock, wrapper } = await deployWrapperCase(c);

      expect(await wrapper.name()).to.equal(c.wrapperName);
      expect(await wrapper.symbol()).to.equal(c.wrapperSymbol);
      expect(await wrapper.underlying()).to.equal(await mock.getAddress());
      expect(await wrapper.underlyingToken()).to.equal(await mock.getAddress());
    });

    it("wraps underlying token", async function () {
      const { alice, mock, wrapper } = await deployWrapperCase(c);
      const amount = ethers.parseUnits("100", 6);
      const wrapperAddress = await wrapper.getAddress();

      await mock.connect(alice).approve(wrapperAddress, amount);
      await wrapper.connect(alice).wrap(alice.address, amount);

      expect(await mock.balanceOf(wrapperAddress)).to.equal(amount);
      expect(await wrapper.confidentialBalanceOf(alice.address)).to.not.equal(ethers.ZeroHash);
    });

    it("confidential transfer updates recipient encrypted balance", async function () {
      const { alice, bob, mock, wrapper } = await deployWrapperCase(c);
      const wrapAmount = ethers.parseUnits("100", 6);
      const transferAmount = 25n;
      const wrapperAddress = await wrapper.getAddress();

      await mock.connect(alice).approve(wrapperAddress, wrapAmount);
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);

      const encryptedInput = await fhevm
        .createEncryptedInput(wrapperAddress, alice.address)
        .add64(Number(transferAmount))
        .encrypt();

      await wrapper
        .connect(alice)
        ["confidentialTransfer(address,bytes32,bytes)"](
          bob.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );

      const bobBalanceHandle = await wrapper.confidentialBalanceOf(bob.address);
      expect(bobBalanceHandle).to.not.equal(ethers.ZeroHash);
    });

    it("creates unwrap request with encrypted amount", async function () {
      const { alice, mock, wrapper } = await deployWrapperCase(c);
      const wrapAmount = ethers.parseUnits("100", 6);
      const wrapperAddress = await wrapper.getAddress();

      await mock.connect(alice).approve(wrapperAddress, wrapAmount);
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);

      const encryptedInput = await fhevm
        .createEncryptedInput(wrapperAddress, alice.address)
        .add64(10)
        .encrypt();

      await expect(
        wrapper
          .connect(alice)
          ["unwrap(address,address,bytes32,bytes)"](
            alice.address,
            alice.address,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.emit(wrapper, "UnwrapRequested");
    });
  });
}

