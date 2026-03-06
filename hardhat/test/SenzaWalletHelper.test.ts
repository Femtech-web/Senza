import { expect } from "chai";
import { ethers } from "hardhat";

describe("SenzaWalletHelper", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("MockConfidentialToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    const helperFactory = await ethers.getContractFactory("SenzaWalletHelper");
    const helper = await helperFactory.deploy();
    await helper.waitForDeployment();

    return { owner, token, helper };
  }

  it("setFavoriteToken should update mapping and emit event for ERC-7984 token", async function () {
    const { helper, token, owner } = await deployFixture();
    await expect(helper.setFavoriteToken(await token.getAddress(), true))
      .to.emit(helper, "FavoriteTokenUpdated")
      .withArgs(await owner.getAddress(), await token.getAddress(), true);
    expect(await helper.favorites(await owner.getAddress(), await token.getAddress())).to.eq(true);
  });

  it("setFavoriteToken should revert for zero address token", async function () {
    const { helper } = await deployFixture();
    await expect(helper.setFavoriteToken(ethers.ZeroAddress, true)).to.be.revertedWithCustomError(
      helper,
      "InvalidToken"
    );
  });

  it("setFavoriteToken should revert for non-ERC7984 token", async function () {
    const { helper } = await deployFixture();
    const [owner] = await ethers.getSigners();
    await expect(helper.setFavoriteToken(await owner.getAddress(), true)).to.be.revertedWithCustomError(
      helper,
      "UnsupportedToken"
    );
  });
});
