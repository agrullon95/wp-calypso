package _self.projects

import _self.bashNodeScript
import _self.lib.wpcom.WPComPluginBuild
import jetbrains.buildServer.configs.kotlin.v2019_2.Project
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType

object WPComPlugins : Project({
	id("WPComPlugins")
	name = "WPCom Plugins"
	description = "Builds for WordPress.com plugins developed in calypso and deployed to wp-admin."

	// Default params for WPcom Plugins.
	params {
		param("docker_image", "registry.a8c.com/calypso/ci-wpcom:latest")
		param("build.prefix", "1")
		checkbox(
			name = "skip_release_diff",
			value = "false",
			label = "Skip release diff",
			description = "Skips the diff against the previous successful build, uploading the artifact as the latest successful build.",
			checked = "true",
			unchecked = "false"
		)
	}

	buildType(EditingToolkit)
	buildType(WpcomBlockEditor)
	buildType(Notifications)
	buildType(O2Blocks)
	buildType(Happychat)
	buildType(InlineHelp)
	buildType(GutenbergUploadSourceMapsToSentry);

	cleanup {
		keepRule {
			id = "keepReleaseBuilds"
			keepAtLeast = allBuilds()
			applyToBuilds {
				inBranches {
					branchFilter = patterns("+:<default>")
				}
				withStatus = successful()
				withTags = anyOf(
					"notifications-release-build",
					"etk-release-build",
					"wpcom-block-editor-release-build",
					"o2-blocks-release-build"
				)
			}
			dataToKeep = everything()
			applyPerEachBranch = true
			preserveArtifactsDependencies = true
		}
	}
})


private object EditingToolkit : WPComPluginBuild(
	buildId = "WPComPlugins_EditorToolKit",
	buildName = "Editing ToolKit",
	releaseTag = "etk-release-build",
	pluginSlug = "editing-toolkit",
	archiveDir = "./editing-toolkit-plugin/",
	docsLink = "PCYsg-mMA-p2",
	normalizeFiles = "sed -i -e \"/^\\s\\* Version:/c\\ * Version: %build.number%\" -e \"/^define( 'A8C_ETK_PLUGIN_VERSION'/c\\define( 'A8C_ETK_PLUGIN_VERSION', '%build.number%' );\" ./release-archive/full-site-editing-plugin.php && sed -i -e \"/^Stable tag:\\s/c\\Stable tag: %build.number%\" ./release-archive/readme.txt\n",
	withSlackNotify = "false",
	buildSteps = {
		bashNodeScript {
			name = "Update version"
			scriptContent = """
				cd apps/editing-toolkit
				# Update plugin version in the plugin file and readme.txt.
				sed -i -e "/^\s\* Version:/c\ * Version: %build.number%" -e "/^define( 'A8C_ETK_PLUGIN_VERSION'/c\define( 'A8C_ETK_PLUGIN_VERSION', '%build.number%' );" ./editing-toolkit-plugin/full-site-editing-plugin.php
				sed -i -e "/^Stable tag:\s/c\Stable tag: %build.number%" ./editing-toolkit-plugin/readme.txt
			"""
		}
		bashNodeScript {
			name = "Run JS tests"
			scriptContent = """
				cd apps/editing-toolkit
				yarn test:js --reporters=default --reporters=jest-teamcity --maxWorkers=${'$'}JEST_MAX_WORKERS
			"""
		}
		// Note: We run the PHP lint after the build to verify that the newspack-blocks
		// code is also formatted correctly.
		bashNodeScript {
			name = "Run PHP Lint"
			scriptContent = """
				cd apps/editing-toolkit
				if [ ! -d "./editing-toolkit-plugin/newspack-blocks/synced-newspack-blocks" ] ; then
					echo "Newspack blocks were not built correctly."
					exit 1
				fi
				yarn lint:php
			"""
		}
	},
	buildParams = {
		param("build.prefix", "3")
	}
)

private object WpcomBlockEditor : WPComPluginBuild(
	buildId = "WPComPlugins_WpcomBlockEditor",
	buildName = "Wpcom Block Editor",
	pluginSlug = "wpcom-block-editor",
	archiveDir = "./dist/",
	buildEnv = "development",
	docsLink = "PCYsg-l4k-p2",
)

private object Notifications : WPComPluginBuild(
	buildId = "WPComPlugins_Notifications",
	buildName = "Notifications",
	pluginSlug = "notifications",
	archiveDir = "./dist/",
	docsLink = "PCYsg-elI-p2",
	// This param is executed in bash right before the build script compares
	// the build with the previous release version. The purpose of this code
	// is to remove sources of randomness so that the diff operation only
	// compares legitimate changes.
	normalizeFiles = """
		function get_hash {
				# If the stylesheet in the HTML file is pointing at "build.min.css?foobar123",
				# this will just return the "foobar123" portion of the file. This
				# is a source of randomness which needs to be eliminated.
				echo `sed -nE 's~.*<link rel="stylesheet" href="build.min.css\?([a-zA-Z0-9]+)">.*~\1~p' ${'$'}1`
		}
		new_hash=`get_hash dist/index.html`
		old_hash=`get_hash release-archive/index.html`

		# All scripts and styles use the same "hash" version, so replace any
		# instances of the hash in the *old* files with the newest version.
		sed -i "s~${'$'}old_hash~${'$'}new_hash~g" release-archive/index.html release-archive/rtl.html

		# Replace the old cache buster with the new one in the previous release html files.
		if [ -f './release-archive/build_meta.json' ] ; then
			old_cache_buster=`jq -r '.cache_buster' ./release-archive/build_meta.json`
		else
			old_cache_buster=`cat ./release-archive/cache-buster.txt`
		fi

		new_cache_buster=`jq -r '.cache_buster' ./dist/build_meta.json`
		sed -i "s~${'$'}old_cache_buster~${'$'}new_cache_buster~g" release-archive/index.html release-archive/rtl.html
	""".trimIndent(),
)

private object O2Blocks : WPComPluginBuild(
	buildId="WPComPlugins_O2Blocks",
	buildName = "O2 Blocks",
	pluginSlug = "o2-blocks",
	archiveDir = "./release-files/",
	docsLink = "PCYsg-r7r-p2",
	buildSteps = {
		bashNodeScript {
			name = "Create release directory"
			scriptContent = """
				cd apps/o2-blocks

				# Copy existing dist files to release directory
				mkdir release-files
				cp -r dist release-files/dist/

				# Add index.php file
				cp index.php release-files/
			"""
		}
	}
)

private object Happychat : WPComPluginBuild(
	buildId = "WPComPlugins_Happychat",
	buildName = "Happychat",
	pluginSlug = "happychat",
	archiveDir = "./dist/",
	docsLink = "TODO",
	withPRNotify = "false",
)

private object InlineHelp : WPComPluginBuild(
	buildId = "WPComPlugins_InlineHelp",
	buildName = "Inline Help",
	pluginSlug = "inline-help",
	archiveDir = "./dist/",
	docsLink = "TODO",
	withPRNotify = "false",
)

private object GutenbergUploadSourceMapsToSentry: BuildType() {
	init {
		name = "Upload Gutenberg Source Maps to Sentry";
		id("WPComPlugins_GutenbergUploadSourceMapsToSentry");

		params {
			text(
				name = "GUTENBERG_VERSION",
				value = "",
				label = "Gutenberg version",
				description = "The Gutenberg version to upload source maps for (include the whole string, including the `v` prefix)",
				allowEmpty = false
			)
		}

		steps {
			bashNodeScript {
				name = "Upload source maps to Sentry"
				scriptContent = """
					# Install the Sentry CLI binary
					curl -sL https://sentry.io/get-cli/ | bash

					rm -rf gutenberg gutenberg.zip

					wget https://github.com/WordPress/gutenberg/releases/download/%GUTENBERG_VERSION%/gutenberg.zip
					unzip gutenberg.zip -d gutenberg
					cd gutenberg

					# Upload the .js and .js.map files to Sentry (`wpcom-test-01` release)
					sentry-cli --auth-token %SENTRY_AUTH_TOKEN% releases --org a8c --project wpcom-gutenberg-wp-admin files wpcom-test-01 upload-sourcemaps . --url-prefix "~/wp-content/plugins/gutenberg-core/v13.1.0/"
				"""
			}
		}
	}
}
