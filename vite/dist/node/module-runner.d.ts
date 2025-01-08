import { ModuleNamespace, ViteHotContext } from '../../types/hot.js';
import { HotPayload, Update } from '../../types/hmrPayload.js';
import { InferCustomEventPayload } from '../../types/customEvent.js';

interface FetchFunctionOptions {
    cached?: boolean;
    startOffset?: number;
}
type FetchResult = CachedFetchResult | ExternalFetchResult | ViteFetchResult;
interface CachedFetchResult {
    /**
     * If module cached in the runner, we can just confirm
     * it wasn't invalidated on the server side.
     */
    cache: true;
}
interface ExternalFetchResult {
    /**
     * The path to the externalized module starting with file://,
     * by default this will be imported via a dynamic "import"
     * instead of being transformed by vite and loaded with vite runner
     */
    externalize: string;
    /**
     * Type of the module. Will be used to determine if import statement is correct.
     * For example, if Vite needs to throw an error if variable is not actually exported
     */
    type: 'module' | 'commonjs' | 'builtin' | 'network';
}
interface ViteFetchResult {
    /**
     * Code that will be evaluated by vite runner
     * by default this will be wrapped in an async function
     */
    code: string;
    /**
     * File path of the module on disk.
     * This will be resolved as import.meta.url/filename
     * Will be equal to `null` for virtual modules
     */
    file: string | null;
    /**
     * Module ID in the server module graph.
     */
    id: string;
    /**
     * Module URL used in the import.
     */
    url: string;
    /**
     * Invalidate module on the client side.
     */
    invalidate: boolean;
}
type InvokeMethods = {
    fetchModule: (id: string, importer?: string, options?: FetchFunctionOptions) => Promise<FetchResult>;
};

type ModuleRunnerTransportHandlers = {
    onMessage: (data: HotPayload) => void;
    onDisconnection: () => void;
};
/**
 * "send and connect" or "invoke" must be implemented
 */
interface ModuleRunnerTransport {
    connect?(handlers: ModuleRunnerTransportHandlers): Promise<void> | void;
    disconnect?(): Promise<void> | void;
    send?(data: HotPayload): Promise<void> | void;
    invoke?(data: HotPayload): Promise<{
        result: any;
    } | {
        error: any;
    }>;
    timeout?: number;
}
interface NormalizedModuleRunnerTransport {
    connect?(onMessage?: (data: HotPayload) => void): Promise<void> | void;
    disconnect?(): Promise<void> | void;
    send(data: HotPayload): Promise<void>;
    invoke<T extends keyof InvokeMethods>(name: T, data: Parameters<InvokeMethods[T]>): Promise<ReturnType<Awaited<InvokeMethods[T]>>>;
}
declare const createWebSocketModuleRunnerTransport: (options: {
    createConnection: () => WebSocket;
    pingInterval?: number;
}) => Required<Pick<ModuleRunnerTransport, "connect" | "disconnect" | "send">>;

interface SourceMapLike {
    version: number;
    mappings?: string;
    names?: string[];
    sources?: string[];
    sourcesContent?: string[];
}
declare class DecodedMap {
    map: SourceMapLike;
    _encoded: string;
    _decoded: undefined | number[][][];
    _decodedMemo: Stats;
    url: string;
    version: number;
    names: string[];
    resolvedSources: string[];
    constructor(map: SourceMapLike, from: string);
}
interface Stats {
    lastKey: number;
    lastNeedle: number;
    lastIndex: number;
}

type CustomListenersMap = Map<string, ((data: any) => void)[]>;
interface HotModule {
    id: string;
    callbacks: HotCallback[];
}
interface HotCallback {
    deps: string[];
    fn: (modules: Array<ModuleNamespace | undefined>) => void;
}
interface HMRLogger {
    error(msg: string | Error): void;
    debug(...msg: unknown[]): void;
}
declare class HMRClient {
    logger: HMRLogger;
    private transport;
    private importUpdatedModule;
    hotModulesMap: Map<string, HotModule>;
    disposeMap: Map<string, (data: any) => void | Promise<void>>;
    pruneMap: Map<string, (data: any) => void | Promise<void>>;
    dataMap: Map<string, any>;
    customListenersMap: CustomListenersMap;
    ctxToListenersMap: Map<string, CustomListenersMap>;
    constructor(logger: HMRLogger, transport: NormalizedModuleRunnerTransport, importUpdatedModule: (update: Update) => Promise<ModuleNamespace>);
    notifyListeners<T extends string>(event: T, data: InferCustomEventPayload<T>): Promise<void>;
    send(payload: HotPayload): void;
    clear(): void;
    prunePaths(paths: string[]): Promise<void>;
    protected warnFailedUpdate(err: Error, path: string | string[]): void;
    private updateQueue;
    private pendingUpdateQueue;
    /**
     * buffer multiple hot updates triggered by the same src change
     * so that they are invoked in the same order they were sent.
     * (otherwise the order may be inconsistent because of the http request round trip)
     */
    queueUpdate(payload: Update): Promise<void>;
    private fetchUpdate;
}

interface DefineImportMetadata {
    /**
     * Imported names before being transformed to `ssrImportKey`
     *
     * import foo, { bar as baz, qux } from 'hello'
     * => ['default', 'bar', 'qux']
     *
     * import * as namespace from 'world
     * => undefined
     */
    importedNames?: string[];
}
interface SSRImportMetadata extends DefineImportMetadata {
    isDynamicImport?: boolean;
}

declare const ssrModuleExportsKey = "__vite_ssr_exports__";
declare const ssrImportKey = "__vite_ssr_import__";
declare const ssrDynamicImportKey = "__vite_ssr_dynamic_import__";
declare const ssrExportAllKey = "__vite_ssr_exportAll__";
declare const ssrImportMetaKey = "__vite_ssr_import_meta__";

interface ModuleRunnerDebugger {
    (formatter: unknown, ...args: unknown[]): void;
}
declare class ModuleRunner {
    options: ModuleRunnerOptions;
    evaluator: ModuleEvaluator;
    private debug?;
    evaluatedModules: EvaluatedModules;
    hmrClient?: HMRClient;
    private readonly envProxy;
    private readonly transport;
    private readonly resetSourceMapSupport?;
    private readonly root;
    private readonly concurrentModuleNodePromises;
    private closed;
    constructor(options: ModuleRunnerOptions, evaluator?: ModuleEvaluator, debug?: ModuleRunnerDebugger | undefined);
    /**
     * URL to execute. Accepts file path, server path or id relative to the root.
     */
    import<T = any>(url: string): Promise<T>;
    /**
     * Clear all caches including HMR listeners.
     */
    clearCache(): void;
    /**
     * Clears all caches, removes all HMR listeners, and resets source map support.
     * This method doesn't stop the HMR connection.
     */
    close(): Promise<void>;
    /**
     * Returns `true` if the runtime has been closed by calling `close()` method.
     */
    isClosed(): boolean;
    private processImport;
    private isCircularModule;
    private isCircularImport;
    private cachedRequest;
    private cachedModule;
    private getModuleInformation;
    protected directRequest(url: string, mod: EvaluatedModuleNode, _callstack: string[]): Promise<any>;
}

interface RetrieveFileHandler {
    (path: string): string | null | undefined | false;
}
interface RetrieveSourceMapHandler {
    (path: string): null | {
        url: string;
        map: any;
    };
}
interface InterceptorOptions {
    retrieveFile?: RetrieveFileHandler;
    retrieveSourceMap?: RetrieveSourceMapHandler;
}

interface ModuleRunnerImportMeta extends ImportMeta {
    url: string;
    env: ImportMetaEnv;
    hot?: ViteHotContext;
    [key: string]: any;
}
interface ModuleRunnerContext {
    [ssrModuleExportsKey]: Record<string, any>;
    [ssrImportKey]: (id: string, metadata?: DefineImportMetadata) => Promise<any>;
    [ssrDynamicImportKey]: (id: string, options?: ImportCallOptions) => Promise<any>;
    [ssrExportAllKey]: (obj: any) => void;
    [ssrImportMetaKey]: ModuleRunnerImportMeta;
}
interface ModuleEvaluator {
    /**
     * Number of prefixed lines in the transformed code.
     */
    startOffset?: number;
    /**
     * Run code that was transformed by Vite.
     * @param context Function context
     * @param code Transformed code
     * @param module The module node
     */
    runInlinedModule(context: ModuleRunnerContext, code: string, module: Readonly<EvaluatedModuleNode>): Promise<any>;
    /**
     * Run externalized module.
     * @param file File URL to the external module
     */
    runExternalModule(file: string): Promise<any>;
}
type ResolvedResult = (ExternalFetchResult | ViteFetchResult) & {
    url: string;
    id: string;
};
type FetchFunction = (id: string, importer?: string, options?: FetchFunctionOptions) => Promise<FetchResult>;
interface ModuleRunnerHmr {
    /**
     * Configure HMR logger.
     */
    logger?: false | HMRLogger;
}
interface ModuleRunnerOptions {
    /**
     * Root of the project
     */
    root: string;
    /**
     * A set of methods to communicate with the server.
     */
    transport: ModuleRunnerTransport;
    /**
     * Configure how source maps are resolved. Prefers `node` if `process.setSourceMapsEnabled` is available.
     * Otherwise it will use `prepareStackTrace` by default which overrides `Error.prepareStackTrace` method.
     * You can provide an object to configure how file contents and source maps are resolved for files that were not processed by Vite.
     */
    sourcemapInterceptor?: false | 'node' | 'prepareStackTrace' | InterceptorOptions;
    /**
     * Disable HMR or configure HMR options.
     *
     * @default true
     */
    hmr?: boolean | ModuleRunnerHmr;
    /**
     * Custom module cache. If not provided, creates a separate module cache for each ModuleRunner instance.
     */
    evaluatedModules?: EvaluatedModules;
}
interface ImportMetaEnv {
    [key: string]: any;
    BASE_URL: string;
    MODE: string;
    DEV: boolean;
    PROD: boolean;
    SSR: boolean;
}

declare class EvaluatedModuleNode {
    id: string;
    url: string;
    importers: Set<string>;
    imports: Set<string>;
    evaluated: boolean;
    meta: ResolvedResult | undefined;
    promise: Promise<any> | undefined;
    exports: any | undefined;
    file: string;
    map: DecodedMap | undefined;
    constructor(id: string, url: string);
}
declare class EvaluatedModules {
    readonly idToModuleMap: Map<string, EvaluatedModuleNode>;
    readonly fileToModulesMap: Map<string, Set<EvaluatedModuleNode>>;
    readonly urlToIdModuleMap: Map<string, EvaluatedModuleNode>;
    /**
     * Returns the module node by the resolved module ID. Usually, module ID is
     * the file system path with query and/or hash. It can also be a virtual module.
     *
     * Module runner graph will have 1 to 1 mapping with the server module graph.
     * @param id Resolved module ID
     */
    getModuleById(id: string): EvaluatedModuleNode | undefined;
    /**
     * Returns all modules related to the file system path. Different modules
     * might have different query parameters or hash, so it's possible to have
     * multiple modules for the same file.
     * @param file The file system path of the module
     */
    getModulesByFile(file: string): Set<EvaluatedModuleNode> | undefined;
    /**
     * Returns the module node by the URL that was used in the import statement.
     * Unlike module graph on the server, the URL is not resolved and is used as is.
     * @param url Server URL that was used in the import statement
     */
    getModuleByUrl(url: string): EvaluatedModuleNode | undefined;
    /**
     * Ensure that module is in the graph. If the module is already in the graph,
     * it will return the existing module node. Otherwise, it will create a new
     * module node and add it to the graph.
     * @param id Resolved module ID
     * @param url URL that was used in the import statement
     */
    ensureModule(id: string, url: string): EvaluatedModuleNode;
    invalidateModule(node: EvaluatedModuleNode): void;
    /**
     * Extracts the inlined source map from the module code and returns the decoded
     * source map. If the source map is not inlined, it will return null.
     * @param id Resolved module ID
     */
    getModuleSourceMapById(id: string): DecodedMap | null;
    clear(): void;
}

declare class ESModulesEvaluator implements ModuleEvaluator {
    startOffset: number;
    runInlinedModule(context: ModuleRunnerContext, code: string): Promise<any>;
    runExternalModule(filepath: string): Promise<any>;
}

export { ESModulesEvaluator, EvaluatedModuleNode, EvaluatedModules, type FetchFunction, type FetchFunctionOptions, type FetchResult, type HMRLogger, type InterceptorOptions, type ModuleEvaluator, ModuleRunner, type ModuleRunnerContext, type ModuleRunnerHmr, type ModuleRunnerImportMeta, type ModuleRunnerOptions, type ModuleRunnerTransport, type ModuleRunnerTransportHandlers, type ResolvedResult, type SSRImportMetadata, createWebSocketModuleRunnerTransport, ssrDynamicImportKey, ssrExportAllKey, ssrImportKey, ssrImportMetaKey, ssrModuleExportsKey };