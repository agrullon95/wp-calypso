/* eslint-disable @typescript-eslint/no-explicit-any */ // We have to do some dynamic parsing and iteration as we validate JSON.
import fs from 'fs';
import path from 'path';

export const TEST_ACCOUNT_NAMES = [
	'defaultUser',
	'eCommerceUser',
	'simpleSiteFreePlanUser',
	'simpleSitePersonalPlanUser',
	'gutenbergSimpleSiteUser',
	'gutenbergSimpleSiteEdgeUser',
	'gutenbergAtomicSiteUser',
	'gutenbergAtomicSiteEdgeUser',
	'coBlocksSimpleSiteEdgeUser',
	'siteEditorSimpleSiteUser',
	'siteEditorSimpleSiteEdgeUser',
	'martechTosUser',
	'calypsoPreReleaseUser',
	'i18nUser',
	'p2User',
	'jetpackUser',
	'jetpackUserPREMIUM',
	'jetpackUserJN',
	'commentingUser',
	'notificationsUser',
	'googleLoginUser',
] as const;

export type TestAccountName = typeof TEST_ACCOUNT_NAMES[ number ];

export type OtherTestSiteName = 'notifications';

export interface Secrets {
	passwordForNewTestSignUps: string;
	storeSandboxCookieValue: string;
	testCouponCode: string;
	wpccAuthPath: string;
	calypsoOauthApplication: {
		client_id: string;
		client_secret: string;
	};
	martechTosUploadCredentials: {
		bearer_token: string;
	};
	mailosaur: {
		apiKey: string;
		inviteInboxId: string;
		signupInboxId: string;
		domainsInboxId: string;
		defaultUserInboxId: string;
	};
	testAccounts: {
		[ key in TestAccountName ]: {
			username: string;
			password: string;
			primarySite?: string;
			otherSites?: string[];
			totpKey?: string;
		};
	};
	otherTestSites: {
		[ key in OtherTestSiteName ]: string;
	};
}

/**
 * Static class that gives you access to secrets needed for E2E testing.
 * You must first decrypt the encrypted secrets for tests to be able to access them.
 * All checking happens at runtime.
 */
export class SecretsManager {
	private static _secretsCache: Secrets;

	/**
	 * Get the secrets. If this is the first time accessed in the node process, it will initialize and cache the secrets.
	 */
	public static get secrets(): Secrets {
		if ( ! this._secretsCache ) {
			this._secretsCache = this.initializeSecrets();
		}

		return this._secretsCache;
	}

	/**
	 * Initializes the secrets needed for E2E testing.
	 */
	private static initializeSecrets(): Secrets {
		const SECRETS_FILE_NAME = 'decrypted-secrets.json';
		const parsedSecrets = this.parseSecretsFile( path.join( __dirname, SECRETS_FILE_NAME ) );
		const fakeReferenceSecrets = this.createFakeSecretsForValidation();
		this.validateSecrets( parsedSecrets, fakeReferenceSecrets );
		return parsedSecrets as Secrets;
	}

	/**
	 * Read and JSON parse the decrypted secrets file.
	 *
	 * @param {string} filePath Full path to the expected decrypted secrets file.
	 * @returns A parsed JSON object.
	 */
	private static parseSecretsFile( filePath: string ): any {
		try {
			// Normally, any fs sync operations are a big no-no.
			// However, this only runs once on module load, and should be safe to do.
			// This is a more runtime deferred version of just having a '.json' module.
			// Once we're on ES2022, this would be a perfect use case for a top-level-await.
			const secretsJson = fs.readFileSync( filePath, {
				encoding: 'utf-8',
			} );
			return JSON.parse( secretsJson );
		} catch ( err ) {
			const error: Error = err as Error;
			throw new Error(
				'Failed to initialize the E2E secrets: Could not find and parse the secrets file.\n' +
					'Have you decrypted the secrets file yet?\n' +
					'Export the decryption key to E2E_SECRETS_KEY and run "yarn decrypt-secrets".\n' +
					`Original error message: ${ error.message }`
			);
		}
	}

	/**
	 * Validates a parsed secrets object against a fake set of reference secrets.
	 * This ensures we have all the keys we expect and they are of the right type.
	 *
	 * @param {any} parsedSecrets The parsed JSON object from the local secrets file.
	 * @param {Secrets} fakeReferenceSecrets A fake secrets object that can be used for reference validation.
	 * @throws If any expected key is missing or the wrong type.
	 */
	private static validateSecrets( parsedSecrets: any, fakeReferenceSecrets: Secrets ): void {
		const compareRecursive = ( target: any, reference: any, keyPath: string[] ) => {
			for ( const key in reference ) {
				if ( ! target?.[ key ] || typeof reference[ key ] !== typeof target[ key ] ) {
					const fullKeyPath = [ ...keyPath, key ].join( '.' );
					throw new Error(
						'Failed to initialize the E2E secrets: Invalid or missing key found in the decrypted secrets.\n' +
							'Make sure you have decrypted the most recent version of the encrypted secrets.\n' +
							'This also may mean the typings for the secrets are stale and need updating.\n\n' +
							'Details:\n' +
							`\tInvalid or missing key: ${ fullKeyPath }\n` +
							`\tExpected type: ${ typeof reference[ key ] }`
					);
				}

				if ( typeof reference[ key ] === 'object' ) {
					compareRecursive( target[ key ], reference[ key ], [ ...keyPath, key ] );
				}
			}
		};

		compareRecursive( parsedSecrets, fakeReferenceSecrets, [] );
	}

	/**
	 * Creates a fake set of secrets that can be used for comparative validation.
	 *
	 * @returns A fake secret object with all expcted required properties.
	 */
	private static createFakeSecretsForValidation(): Secrets {
		const fakeAccount = {
			username: 'FAKE_VALUE',
			password: 'FAKE_VALUE',
		};

		return {
			passwordForNewTestSignUps: 'FAKE_VALUE',
			storeSandboxCookieValue: 'FAKE_VALUE',
			testCouponCode: 'FAKE_VALUE',
			wpccAuthPath: 'FAKE_VALUE',
			calypsoOauthApplication: {
				client_id: 'FAKE_VALUE',
				client_secret: 'FAKE_VALUE',
			},
			martechTosUploadCredentials: {
				bearer_token: 'FAKE_VALUE',
			},
			mailosaur: {
				apiKey: 'FAKE_VALUE',
				inviteInboxId: 'FAKE_VALUE',
				signupInboxId: 'FAKE_VALUE',
				domainsInboxId: 'FAKE_VALUE',
				defaultUserInboxId: 'FAKE_VALUE',
			},
			testAccounts: {
				defaultUser: { ...fakeAccount },
				eCommerceUser: { ...fakeAccount },
				simpleSiteFreePlanUser: { ...fakeAccount },
				simpleSitePersonalPlanUser: { ...fakeAccount },
				gutenbergSimpleSiteUser: { ...fakeAccount },
				gutenbergSimpleSiteEdgeUser: { ...fakeAccount },
				gutenbergAtomicSiteUser: { ...fakeAccount },
				gutenbergAtomicSiteEdgeUser: { ...fakeAccount },
				coBlocksSimpleSiteEdgeUser: { ...fakeAccount },
				siteEditorSimpleSiteUser: { ...fakeAccount },
				siteEditorSimpleSiteEdgeUser: { ...fakeAccount },
				martechTosUser: { ...fakeAccount },
				calypsoPreReleaseUser: { ...fakeAccount },
				i18nUser: { ...fakeAccount },
				// This one needs a totpKey
				p2User: { ...fakeAccount, totpKey: 'FAKE_VALUE' },
				jetpackUser: { ...fakeAccount },
				jetpackUserPREMIUM: { ...fakeAccount },
				jetpackUserJN: { ...fakeAccount },
				commentingUser: { ...fakeAccount },
				notificationsUser: { ...fakeAccount },
				googleLoginUser: { ...fakeAccount },
			},
			otherTestSites: {
				notifications: 'FAKE_VALUE',
			},
		};
	}
}
