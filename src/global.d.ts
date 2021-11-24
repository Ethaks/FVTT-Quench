export {};

declare global {
  namespace ClientSettings {
    interface Values {
      "quench.logTestDetails": boolean;
    }
  }

  namespace Chai {
    interface AssertionError {
      snapshotError?: boolean;
    }
  }

  namespace Mocha {
    interface Runnable {
      _quench_parentBatch: string;
    }
    interface Suite {
      _quench_parentBatch: string;
      _quench_batchRoot: boolean;
      get id(): string;
    }
    interface Test {
      get id(): string;
    }
  }
  interface BrowserMocha {
    _cleanReferencesAfterRun: boolean;
  }
}
