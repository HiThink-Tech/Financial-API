# npm Publishing

1. Obtain team approval for an open-source license and add `hithink-finance-cli/LICENSE`; publishing is blocked until this exists.
2. Create the `hithink-tech` npm organization, enable maintainer 2FA, and manually publish the first verified version.
3. Bind Trusted Publisher to `hithink-finance-cli-release.yml`, environment `npm-production`, repository `HiThink-Tech/Financial-API`.
4. Update version and CHANGELOG, tag immutable `vX.Y.Z`, approve the protected environment, then verify provenance, dist-tags, global installation, Skills, doctor and uninstall.
5. Publish stable versions to `latest` and prereleases to `next`. Never use a long-lived npm token.
