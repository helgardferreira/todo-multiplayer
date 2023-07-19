import { Subject } from "rxjs";

const fromChannel = (channel: BroadcastChannel) => {
  const dataSubject = new Subject<Uint8Array>();
  channel.onmessage = (event) => {
    if (event.data instanceof Uint8Array) dataSubject.next(event.data);
  };
  channel.onmessageerror = (event) => {
    dataSubject.error(event);
  };

  return dataSubject.asObservable();
};

export default fromChannel;
