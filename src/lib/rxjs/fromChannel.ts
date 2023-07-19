import { Subject, finalize } from "rxjs";

const fromChannel = (channel: BroadcastChannel) => {
  const dataSubject = new Subject<Uint8Array>();

  const handleMessage = (event: MessageEvent) => {
    if (event.data instanceof Uint8Array) dataSubject.next(event.data);
  };
  channel.addEventListener("message", handleMessage);

  const handleMessageError = (event: MessageEvent) => {
    dataSubject.error(event);
  };
  channel.addEventListener("messageerror", handleMessageError);

  return dataSubject.pipe(
    finalize(() => {
      console.log("Channel closed");
      channel.removeEventListener("message", handleMessage);
      channel.removeEventListener("messageerror", handleMessageError);
    })
  );
};

export default fromChannel;
