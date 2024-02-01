import { contextBridge, ipcRenderer } from 'electron';
import {
  PlatformExecutor,
  MiniAppBridge,
  Callback,
  mabMessageQueue,
} from '../common-bridge'; // Adjust the import path as needed
import { Platform } from '../types/platform'; // Adjust the import path as needed

/* tslint:disable:no-any */
let uniqueId = Math.random();

class ElectronExecutor implements PlatformExecutor {
  execEvents(event: Event): void {
    (window as any).dispatchEvent(event);
  }

  exec(
    action: string,
    param: any,
    onSuccess: (value: string) => void,
    onError: (error: string) => void
  ): void {
    const callback = {} as Callback;
    callback.onSuccess = onSuccess;
    callback.onError = onError;
    callback.id = String(++uniqueId);
    mabMessageQueue.unshift(callback);

    ipcRenderer.once(`reply-${callback.id}`, (event, response) => {
      if (response.error) {
        callback.onError(response.error);
      } else {
        callback.onSuccess(response.data);
      }
    });

    contextBridge.exposeInMainWorld('linkDesktop', {
      miniAppActionCall: () =>
        ipcRenderer.invoke('miniapp-action', {
          action,
          param,
          id: callback.id,
        }),
    });
  }

  getPlatform(): string {
    return Platform.ELECTRON;
  }
}

const electronExecutor = new ElectronExecutor();
(window as any).linkDesktop = new MiniAppBridge(electronExecutor);

// Example of overriding a specific functionality, similar to the iOS bridge geolocation override
// navigator.geolocation.getCurrentPosition = (success, error, options) => {
//   return electronExecutor.exec(
//     'getCurrentPosition',
//     { locationOptions: options },
//     value => {
//       try {
//         const parsedData = JSON.parse(value);
//         success(parsedData);
//       } catch (error) {
//         error({
//           code: 2, // POSITION_UNAVAILABLE
//           message: 'Failed to parse location object from MiniAppBridge: ' + error,
//         });
//       }
//     },
//     error => console.error(error)
//   );
// };
