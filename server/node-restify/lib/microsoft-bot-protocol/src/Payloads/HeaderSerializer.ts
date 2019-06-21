import { TransportContants } from '../Transport/TransportConstants';
import { Header } from './Models/Header';
import { PayloadTypes } from './Models/PayloadTypes';

export class HeaderSerializer {
  public static readonly Delimiter = '.';
  public static readonly Terminator = '\n';
  public static readonly End = '1';
  public static readonly NotEnd = '0';
  public static readonly TypeOffset: number = 0;
  public static readonly TypeDelimiterOffset = 1;
  public static readonly LengthOffset = 2;
  public static readonly LengthLength = 6;
  public static readonly LengthDelimeterOffset = 8;
  public static readonly IdOffset = 9;
  public static readonly IdLength = 36;
  public static readonly IdDelimeterOffset = 45;
  public static readonly EndOffset = 46;
  public static readonly TerminatorOffset = 47;

  public static serialize(header: Header, buffer: Buffer): void {
    buffer.write(header.PayloadType, 'utf8');
    buffer.write(this.Delimiter, HeaderSerializer.TypeDelimiterOffset, 'utf8');
    buffer.write(this.headerLengthPadder(header.PayloadLength, this.LengthLength, '0'), HeaderSerializer.LengthOffset, 'utf8');
    buffer.write(this.Delimiter, HeaderSerializer.LengthDelimeterOffset, 'utf8');
    buffer.write(header.Id, HeaderSerializer.IdOffset);
    buffer.write(this.Delimiter, HeaderSerializer.IdDelimeterOffset, 'utf8');
    buffer.write(header.End ? this.End : this.NotEnd, HeaderSerializer.EndOffset);
    buffer.write(this.Terminator, HeaderSerializer.TerminatorOffset);
  }

  public static deserialize(buffer: Buffer): Header {
    let jsonBuffer = buffer.toString('utf8');
    let headerArray = jsonBuffer.split(this.Delimiter);

    if (headerArray.length < 4) {
      throw Error('Cannot parse header, header is malformed.');
    }

    let headerPayloadType = this.payloadTypeByValue(headerArray[0]);
    let headerPayloadLength = Number(headerArray[1]);
    let headerId = headerArray[2];
    let headerEnd = headerArray[3].startsWith(this.End);
    let header = new Header(headerPayloadType, headerPayloadLength, headerId, headerEnd);

    // Note: The constant MaxPayloadLength refers to the chunk size, not the declared length in the header, so
    // we use MaxLength here.
    if (header.PayloadLength < TransportContants.MinLength || header.PayloadLength > TransportContants.MaxLength || header.PayloadLength === undefined) {
      throw Error(`Header payload length must be greater than ${TransportContants.MinLength.toString()} and less than ${TransportContants.MaxLength.toString()}`);
    }

    if (header.Id === undefined) {
      throw Error('Header ID is missing or malformed.');
    }

    if (header.End === undefined) {
      throw Error('Header End is missing or not a valid value.');
    }

    return header;
  }

  public static headerLengthPadder(lengthValue: number, totalLength: number, padChar: string): string {
    let result = Array(totalLength + 1)
      .join(padChar);

    let lengthString = lengthValue.toString();

    return (result + lengthString).slice(lengthString.length);
  }

  public static payloadTypeByValue(value: string) {
    switch (value) {
      case 'A':
        return PayloadTypes.request;
        break;
      case 'B':
        return PayloadTypes.response;
        break;
      case 'S':
        return PayloadTypes.stream;
        break;
      case 'X':
        return PayloadTypes.cancelAll;
        break;
      case 'C':
        return PayloadTypes.cancelStream;
        break;
      default:
        throw Error('Header payload type is malformed.');
    }
  }
}
