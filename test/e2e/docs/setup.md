<div style="width: 45%; float:left" align="left"><a href="./overview.md"><-- Overview</a> </div>
<div style="width: 5%; float:left" align="center"><a href="./../README.md">Top</a></div>
<div style="width: 45%; float:right"align="right"><a href="./test_environment.md">Test Environment --></a> </div>

<br><br>

# Setup

<!-- TOC -->

- [Setup](#setup)
  - [Regular setup](#regular-setup)
  - [Apple Silicon emulated x86_64](#apple-silicon-emulated-x86_64)
  - [Apple Silicon arm64](#apple-silicon-arm64)
  - [Help](#help)

<!-- /TOC -->

## Regular setup

Follow the [Quick Start](../README.md) guide to install required software.

## Apple Silicon (emulated x86_64)

1. install i386 Homebrew:

```
arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
```

2. install `nvm` using i386 Homebrew:

```
arch -x86_64 /usr/local/bin/brew install nvm
```

**This is critical! If nvm is installed using ARM64 Homebrew, installed Node versions will also be the ARM64 variant and there will be problems!**

3. using `nvm`, install the current version of NodeJS used in `wp-calypso`:

```
nvm install <node_version>
```

4. instruct `nvm` to use the version of NodeJS installed in previous step:

```
nvm use <node_version>
```

5. update `npm` version:

```
arch -x86_64 npm install -g npm@latest
```

6. install `yarn`:

```
arch -x86_64 npm install yarn
```

7. install all dependencies from repo root:

```
arch -x86_64 yarn install --frozen-lockfile
```

At any point, run `arch` to verify whether shell is running with Rosetta 2 emulation.

## Apple Silicon (arm64)

Similar to instructions in macOS Intel architecture, install the arm64 variant of the required software, then follow these steps:

1. set the following environment variables:

```
PUPPETEER_SKIP_DOWNLOAD=true
```

2. install dependencies:

```
yarn install
```

## Help

See the [Troubleshooting](troubleshooting.md) section.
