 
import {
  initSandboxCompatibility,
  patchPostMessageForSandbox,
  listenForPiSDKMessages,
} from "@/lib/pi-sandbox";

describe("pi-sandbox", () => {
  let originalPostMessage: any;
  let originalParent: any;

  beforeEach(() => {
    originalPostMessage = window.postMessage;
    originalParent = window.parent;
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.postMessage = originalPostMessage;
    Object.defineProperty(window, "parent", {
      value: originalParent,
      writable: true,
      configurable: true,
    });
    // Remove any event listeners
    jest.restoreAllMocks();
  });

  describe("patchPostMessageForSandbox", () => {
    it("should forward Pi SDK messages to window.parent when running in an iframe", () => {
      const mockParent = {
        postMessage: jest.fn(),
      };

      Object.defineProperty(window, "parent", {
        value: mockParent,
        configurable: true,
      });

      const mockOriginalPostMessage = jest.fn();
      window.postMessage = mockOriginalPostMessage;

      patchPostMessageForSandbox();

      // Send a Pi SDK message (string)
      const sdkMessageStr = "@pi:app:sdk:auth";
      window.postMessage(sdkMessageStr, "https://app.minepi.com");

      expect(mockParent.postMessage).toHaveBeenCalledWith(
        sdkMessageStr,
        "https://app.minepi.com"
      );
      expect(mockOriginalPostMessage).not.toHaveBeenCalled();

      // Send a Pi SDK message (object)
      const sdkMessageObj = { type: "@pi:app:sdk:payment", data: {} };
      window.postMessage(sdkMessageObj, "https://app.minepi.com");

      expect(mockParent.postMessage).toHaveBeenCalledWith(
        sdkMessageObj,
        "https://app.minepi.com"
      );
    });

    it("should pass non-Pi-SDK messages to the original postMessage when running in an iframe", () => {
      const mockParent = {
        postMessage: jest.fn(),
      };

      Object.defineProperty(window, "parent", {
        value: mockParent,
        configurable: true,
      });

      const mockOriginalPostMessage = jest.fn();
      window.postMessage = mockOriginalPostMessage;

      patchPostMessageForSandbox();

      const normalMessage = "hello-world";
      window.postMessage(normalMessage, "https://example.com");

      expect(mockParent.postMessage).not.toHaveBeenCalled();
      expect(mockOriginalPostMessage).toHaveBeenCalledWith(
        normalMessage,
        "https://example.com"
      );
    });

    it("should pass all messages to the original postMessage when not running in an iframe", () => {
      // Not in an iframe: window.parent === window
      Object.defineProperty(window, "parent", {
        value: window,
        configurable: true,
      });

      const mockOriginalPostMessage = jest.fn();
      window.postMessage = mockOriginalPostMessage;

      patchPostMessageForSandbox();

      const sdkMessage = "@pi:app:sdk:auth";
      window.postMessage(sdkMessage, "https://app.minepi.com");

      expect(mockOriginalPostMessage).toHaveBeenCalledWith(
        sdkMessage,
        "https://app.minepi.com"
      );
    });
  });

  describe("listenForPiSDKMessages", () => {
    let mockSource: any;
    let cleanup: (() => void) | undefined;

    beforeEach(() => {
      mockSource = {
        postMessage: jest.fn(),
      };
      cleanup = listenForPiSDKMessages();
    });

    afterEach(() => {
      cleanup?.();
      cleanup = undefined;
    });

    it("should respond to @pi:app:sdk:communication_information_request with a communication response", () => {
      const requestMsg = {
        type: "@pi:app:sdk:communication_information_request",
        id: "request-id-123",
        payload: {
          slug: "my-app-slug",
          name: "Test App",
        },
      };

      const event = new MessageEvent("message", {
        data: JSON.stringify(requestMsg),
        origin: "https://app.minepi.com",
        source: mockSource,
      });

      window.dispatchEvent(event);

      expect(mockSource.postMessage).toHaveBeenCalled();
      const [responseStr, options] = mockSource.postMessage.mock.calls[0];
      const response = JSON.parse(responseStr);

      expect(response.type).toBe("@pi:app:sdk:communication_information_response");
      expect(response.id).toBe("request-id-123");
      expect(response.payload.slug).toBe("my-app-slug");
      expect(response.payload.name).toBe("Test App");
      expect(options.targetOrigin).toBe("https://app.minepi.com");
    });

    it("should set targetOrigin to '*' if event origin is 'null' (sandboxed unique origin fallback)", () => {
      const requestMsg = {
        type: "@pi:app:sdk:communication_information_request",
        id: "request-id-456",
      };

      const event = new MessageEvent("message", {
        data: JSON.stringify(requestMsg),
        origin: "null",
        source: mockSource,
      });

      window.dispatchEvent(event);

      expect(mockSource.postMessage).toHaveBeenCalled();
      const [, options] = mockSource.postMessage.mock.calls[0];
      expect(options.targetOrigin).toBe("*");
    });

    it("should ignore messages with incorrect origins", () => {
      const requestMsg = {
        type: "@pi:app:sdk:communication_information_request",
        id: "request-id-789",
      };

      const event = new MessageEvent("message", {
        data: JSON.stringify(requestMsg),
        origin: "https://malicious-site.com",
        source: mockSource,
      });

      window.dispatchEvent(event);

      expect(mockSource.postMessage).not.toHaveBeenCalled();
    });

    it("should ignore non-JSON messages gracefully", () => {
      const event = new MessageEvent("message", {
        data: "plain-text-non-json",
        origin: "https://app.minepi.com",
        source: mockSource,
      });

      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();

      expect(mockSource.postMessage).not.toHaveBeenCalled();
    });
  });

  describe("initSandboxCompatibility", () => {
    it("should patch postMessage and register listeners when window is defined", () => {
      const mockOriginalPostMessage = jest.fn();
      window.postMessage = mockOriginalPostMessage;

      // Spy on addEventListener
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      initSandboxCompatibility();

      expect(addEventListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));
    });
  });
});
