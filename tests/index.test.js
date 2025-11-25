import { describe, expect, it } from "vitest";
import { AppError, createAppErrorBuilder, errorHandlerPlugin } from "../index.js";

describe("package entry point", () => {
  it("exposes static factories on AppError", () => {
    const network = AppError.network({ messages: "Network issue" });
    expect(network).toHaveProperty("code", "NETWORK_ERROR");
    expect(network.messages.user.en).toBe("Network issue");
    expect(AppError.isAppError(network)).toBe(true);
  });

  it("supports direct instantiation via the extended AppError class", () => {
    const direct = new AppError({
      code: "DIRECT",
      type: AppError.Types.UNKNOWN,
      messages: "Direct error",
    });

    expect(direct).toBeInstanceOf(AppError);
    expect(direct.code).toBe("DIRECT");
    expect(direct.messages.user.en).toBe("Direct error");
  });

  it("re-exports createAppErrorBuilder", () => {
    const error = createAppErrorBuilder({ code: "MY_ERROR", type: AppError.Types.SYSTEM })
      .withMessages("System broke")
      .build();

    expect(error.code).toBe("MY_ERROR");
    expect(error.type).toBe("system");
  });

  it("re-exports errorHandlerPlugin", () => {
    expect(typeof errorHandlerPlugin).toBe("function");
  });

  it("exposes level and type enums", () => {
    expect(AppError.Levels.ERROR).toBe("error");
    expect(AppError.Types.NETWORK).toBe("network");
  });
});
