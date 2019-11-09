/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {LanguageServiceDefaultsImpl} from './monaco.contribution';
import {VueWorker} from './vueWorker';

import Promise = monaco.Promise;
import IDisposable = monaco.IDisposable;
import Uri = monaco.Uri;

const STOP_WHEN_IDLE_FOR = 2 * 60 * 1000; // 2min

export class WorkerManager {

	private _defaults: LanguageServiceDefaultsImpl;
	private _idleCheckInterval: number;
	private _lastUsedTime: number;
	private _configChangeListener: IDisposable;

	private _worker: monaco.editor.MonacoWebWorker<VueWorker>;
	private _client: Promise<VueWorker>;

	constructor(defaults: LanguageServiceDefaultsImpl) {
		this._defaults = defaults;
		this._worker = null;
		this._idleCheckInterval = setInterval(() => this._checkIfIdle(), 30 * 1000);
		this._lastUsedTime = 0;
		this._configChangeListener = this._defaults.onDidChange(() => this._stopWorker());
	}

	private _stopWorker(): void {
		if (this._worker) {
			this._worker.dispose();
			this._worker = null;
		}
		this._client = null;
	}

	dispose(): void {
		clearInterval(this._idleCheckInterval);
		this._configChangeListener.dispose();
		this._stopWorker();
	}

	private _checkIfIdle(): void {
		if (!this._worker) {
			return;
		}
		let timePassedSinceLastUsed = Date.now() - this._lastUsedTime;
		if (timePassedSinceLastUsed > STOP_WHEN_IDLE_FOR) {
			this._stopWorker();
		}
	}

	private _getClient(): Promise<VueWorker> {
		this._lastUsedTime = Date.now();

		if (!this._client) {
			this._worker = monaco.editor.createWebWorker<VueWorker>({

				// module that exports the create() method and returns a `HTMLWorker` instance
				moduleId: 'vs/language/vue/vueWorker',

				// passed in to the create() method
				createData: {
					languageSettings: this._defaults.options,
					languageId: this._defaults.languageId
				},

				label: this._defaults.languageId
			});

			this._client = this._worker.getProxy();
		}

		return this._client;
	}

	getLanguageServiceWorker(...resources: Uri[]): Promise<VueWorker> {
		let _client: VueWorker;
		return toShallowCancelPromise(
			this._getClient().then((client) => {
				_client = client
			}).then(_ => {
				return this._worker.withSyncedResources(resources)
			}).then(_ => _client)
		);
	}
}

function toShallowCancelPromise<T>(p: Promise<T>): Promise<T> {
	let completeCallback: (value: T) => void;
	let errorCallback: (err: any) => void;

	let r = new Promise<T>((c, e) => {
		completeCallback = c;
		errorCallback = e;
	}, () => { });

	p.then(completeCallback, errorCallback);

	return r;
}
