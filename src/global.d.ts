import { QuenchSnapshotManager } from "./module/quench-snapshot.js";
import Quench from "./module/quench.js";
export {};

declare global {
  var quench: Quench;

  interface QuenchSnapshotManager {
    constructor: typeof QuenchSnapshotManager;
  }

  namespace ClientSettings {
    interface Values {
      "quench.logTestDetails": boolean;
    }
  }

  interface LenientGlobalVariableTypes {
    game: never;
  }

  interface AssertStatic {
    matchSnapshot: matchSnapshot;
  }
  namespace Chai {
    interface AssertStatic {
      matchSnapshot: matchSnapshot;
    }

    interface Assertion {
      matchSnapshot: matchSnapshot;
    }
  }

  namespace Mocha {
    interface utils {}
    interface Runnable {
      _quench_parentBatch: string;
    }
    interface Suite {
      //constructor(title2: string, parentContext: Mocha.Context, isRoot?: boolean);
      _quench_parentBatch: string;
      _quench_batchRoot: boolean;
      get id(): string;
    }
    interface Test {
      id: string;
    }
  }
  interface BrowserMocha {
    _cleanReferencesAfterRun: boolean;
  }
}

declare type matchSnapshot = (obj?: any) => void;
