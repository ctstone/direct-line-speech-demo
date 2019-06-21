import { HeaderSerializer } from '../Payloads/HeaderSerializer';
import { Header } from '../Payloads/Models/Header';
import { PayloadTypes } from '../Payloads/Models/PayloadTypes';
import { Stream } from '../Stream';
import { ITransportReceiver } from '../Transport/ITransportReceiver';
import { TransportContants } from '../Transport/TransportConstants';
import { IPayloadReceiver } from './IPayloadReceiver';
import { TransportDisconnectedEventArgs } from './TransportDisconnectedEventArgs';

export class PayloadReceiver implements IPayloadReceiver {
  public isConnected: boolean;
  public disconnected: (sender: object, args: any) => void;
  private _receiver: ITransportReceiver;
  private _receiveHeaderBuffer: Buffer;
  private _receivePayloadBuffer: Buffer;
  private _getStream: (header: Header) => Stream;
  private _receiveAction: (header: Header, stream: Stream, length: Number) => void;

  //public isConnected(): boolean { return this._receiver !== undefined; }

  public connect(receiver: ITransportReceiver) {
    if (this.isConnected) {
      throw new Error('Already connected.');
    } else {
      this._receiver = receiver;
      this.isConnected = true;
      this.runReceive();
    }
  }

  public subscribe(getStream: (header: Header) => Stream, receiveAction: (header: Header, stream: Stream, count: number) => void) {
    this._getStream = getStream;
    this._receiveAction = receiveAction;
  }

  public disconnect(disconnectArgs: any) {
    let didDisconnect = false;
    try {
      if (this.isConnected) {
        this._receiver.close();
        didDisconnect = true;
        this.isConnected = false;
      }
    } catch (error) {
      this.isConnected = false;
      this.disconnected(error.message, disconnectArgs);
    }
    this._receiver = undefined;
    this.isConnected = false;

    if (didDisconnect) {
      this.disconnected(Object('PayloadReceiver has been disconnected.'), disconnectArgs);
    }
  }

  public runReceive(): void {
    this.receivePacketsAsync()
      .catch();
  }

  private async receivePacketsAsync() {
    let isClosed = false;

    while (this.isConnected && !isClosed) {
      try {
        let readSoFar = 0;
        while (readSoFar < TransportContants.MaxHeaderLength) {
          this._receiveHeaderBuffer = await this._receiver.receiveAsync(TransportContants.MaxHeaderLength - readSoFar);
          readSoFar += this._receiveHeaderBuffer.length;
        }

        let header = HeaderSerializer.deserialize(this._receiveHeaderBuffer);
        let isStream = header.PayloadType === PayloadTypes.stream;

        console.log("Got header isStream=", isStream);

        if (header.PayloadLength > 0) {
          let bytesActuallyRead = 0;

          let contentStream = this._getStream(header);

          while (bytesActuallyRead < header.PayloadLength && bytesActuallyRead < TransportContants.MaxPayloadLength) {
            let count = Math.min(header.PayloadLength - bytesActuallyRead, TransportContants.MaxPayloadLength);
            //this._receivePayloadBuffer = Buffer.alloc(count);
            this._receivePayloadBuffer = await this._receiver.receiveAsync(count);
            bytesActuallyRead += this._receivePayloadBuffer.byteLength;

            contentStream.write(this._receivePayloadBuffer);

            // If this is a stream we want to keep handing it up as it comes in
            if (isStream) {
              console.log("THIS IS STREAM SO RECEIVEACTION IS CALLED");
              this._receiveAction(header, contentStream, bytesActuallyRead);
            }
          }

          if (!isStream) {
            this._receiveAction(header, contentStream, bytesActuallyRead);
          }
        }
      } catch (error) {
        isClosed = true;
        this.disconnect(new TransportDisconnectedEventArgs(error.message));
      }
    }
  }
}
