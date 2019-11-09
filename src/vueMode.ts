/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {WorkerManager} from './workerManager';
import {VueWorker} from './vueWorker';
import {LanguageServiceDefaultsImpl} from './monaco.contribution';
import * as languageFeatures from './languageFeatures';

import Promise = monaco.Promise;
import Uri = monaco.Uri;
import IDisposable = monaco.IDisposable;

export function setupMode(defaults: LanguageServiceDefaultsImpl): void {

	let disposables: IDisposable[] = [];

	const client = new WorkerManager(defaults);
	disposables.push(client);

	const worker: languageFeatures.WorkerAccessor = (...uris: Uri[]): Promise<VueWorker> => {
		return client.getLanguageServiceWorker(...uris);
	};

	let languageId = defaults.languageId;

	// all modes
	disposables.push(monaco.languages.registerCompletionItemProvider(languageId, new languageFeatures.CompletionAdapter(worker)));
	disposables.push(monaco.languages.registerDocumentHighlightProvider(languageId, new languageFeatures.DocumentHighlightAdapter(worker)));
	disposables.push(monaco.languages.registerLinkProvider(languageId, new languageFeatures.DocumentLinkAdapter(worker)));

	// only vue
	if (languageId === 'vue') {
		disposables.push(monaco.languages.registerDocumentFormattingEditProvider(languageId, new languageFeatures.DocumentFormattingEditProvider(worker)));
		disposables.push(monaco.languages.registerDocumentRangeFormattingEditProvider(languageId, new languageFeatures.DocumentRangeFormattingEditProvider(worker)));
		disposables.push(new languageFeatures.DiagnostcsAdapter(languageId, worker));
	}
}
