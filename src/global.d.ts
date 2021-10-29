import { QuenchSnapshotManager } from "./module/quench-snapshot";
import Quench from "./module/quench";
export {};

declare global {
  /* eslint-disable-next-line no-var */ // Necessary for global addition
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

  namespace Chai {
    interface AssertStatic {
      /** Compares equality of serialised argument and previously stored snapshot */
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // This function is meant to consume anything
      matchSnapshot: (obj: any) => void;
    }

    interface Assertion {
      /** Compares equality of a test's serialised object and previously stored snapshot */
      matchSnapshot: () => void;
    }

    interface AssertionError {
      snapshotError?: boolean;
    }
  }

  namespace Mocha {
    /* eslint-disable-next-line @typescript-eslint/no-empty-interface */ // Error in mocha types
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
