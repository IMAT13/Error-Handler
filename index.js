import { AppError as BaseAppError } from "./src/app-error.js";
import ErrorFactory from "./src/helpers/factories.js";

export { createAppErrorBuilder } from "./src/app-error.builder.js";
export { errorHandlerPlugin } from "./src/plugins/vue.js";

export class AppError extends BaseAppError {
  static network = ErrorFactory.network;
  static validation = ErrorFactory.validation;
  static mapping = ErrorFactory.mapping;
  static permission = ErrorFactory.permission;
  static component = ErrorFactory.component;
  static environment = ErrorFactory.environment;
  static system = ErrorFactory.system;
  static unknown = ErrorFactory.unknown;
  static feature = ErrorFactory.feature;
  static isAppError = ErrorFactory.isAppError;
  static Levels = ErrorFactory.Levels;
  static Types = ErrorFactory.Types;
  constructor(options) {
    super(options);
  }
}
