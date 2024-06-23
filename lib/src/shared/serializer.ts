import { Buffer } from "buffer";

function isInt(number: number) {
  return Number(number) === number && number % 1 === 0;
}

function isFloat(number: number) {
  return Number(number) === number && number % 1 !== 0;
}

export enum DataType {
  Number,
  ZeroNumber,
  NegativeNumber,

  String,
  EmptyString,

  FloatNumber,
  ZeroFloatNumber,
  NegativeFloatNumber,

  BigNumber,

  True,
  False,

  Null,
  Undefined,

  Array,
  SingleEntryArray,
  EmptyArray,

  Object,
  SingleEntryObject,
  EmptyObject,

  Date,
  Error,

  Buffer,
  EmptyBuffer,
}

enum ArrayFeedType {
  Skip,
  Entry,
}

enum ObjectFeedType {
  Key,
  Value,
}

function serializeString(input: string): Buffer {
  return Buffer.from(input, "utf-8");
}

function deserializeString(input: Buffer): string {
  return input.toString("utf-8");
}

function serializeNumber(input: number): Buffer {
  const buffer = new Int32Array(1);

  buffer[0] = input;
  return Buffer.from(buffer.buffer);
}

function deserializeNumber(input: Buffer): number {
  return Number(new Int32Array(new Uint8Array(input).buffer)[0]);
}

function serializeFloat(input: number): Buffer {
  const buffer = new Float64Array(1);
  buffer[0] = input;
  return Buffer.from(buffer.buffer);
}

function deserializeFloat(input: Buffer): number {
  const buffer = new Float64Array(new Uint8Array(input).buffer);
  return Number(buffer[0]);
}

function serializeArray<T extends unknown[]>(input: T): Buffer[] {
  const buffer: Buffer[] = [];

  for (let index = 0; index < input.length; index++) {
    const nested = _serialize(input[index]);

    buffer.push(serializeNumber(nested.reduce((a, b) => a + b.length, 0)));
    buffer.push(...nested);
  }

  return buffer;
}

function deserializeArray<T extends unknown[]>(input: Buffer): T {
  function consumeRead(length: number): Buffer {
    const result = input.subarray(0, length);

    input = input.subarray(length);
    return result;
  }

  const result: T = [] as never;

  for (let index = 0; index < input.length; index++) {
    result.push(deserialize(consumeRead(deserializeNumber(consumeRead(4)))));
  }

  return result;
}

export function _serialize<T>(input: T): Buffer[] {
  const buffer: Buffer[] = [];

  if (typeof input === "string") {
    if (input.length === 0) {
      buffer.push(Buffer.from([DataType.EmptyString]));
    } else {
      buffer.push(Buffer.from([DataType.String]));
      buffer.push(serializeString(input));
    }
  } else if (typeof input === "number") {
    if (isInt(input)) {
      if (input === 0) {
        buffer.push(Buffer.from([DataType.ZeroNumber]));
      } else if (input < 0) {
        buffer.push(Buffer.from([DataType.NegativeNumber]));
        buffer.push(serializeNumber(-input));
      } else {
        buffer.push(Buffer.from([DataType.Number]));
        buffer.push(serializeNumber(input));
      }
    } else if (isFloat(input)) {
      if (input === 0) {
        buffer.push(Buffer.from([DataType.ZeroFloatNumber]));
      } else if (input < 0) {
        buffer.push(Buffer.from([DataType.NegativeFloatNumber]));
        buffer.push(serializeFloat(-input));
      } else {
        buffer.push(Buffer.from([DataType.FloatNumber]));
        buffer.push(serializeFloat(input));
      }
    }
  } else if (typeof input === "bigint") {
    buffer.push(Buffer.from([DataType.BigNumber]));
    buffer.push(serializeNumber(Number(input)));
  } else if (typeof input === "boolean") {
    buffer.push(Buffer.from([input ? DataType.True : DataType.False]));
  } else if (input === null) {
    buffer.push(Buffer.from([DataType.Null]));
  } else if (input === undefined) {
    buffer.push(Buffer.from([DataType.Undefined]));
  } else if (Array.isArray(input)) {
    buffer.push(Buffer.from([DataType.Array]));

    buffer.push(...serializeArray(input));
  } else if (input instanceof Date) {
    buffer.push(Buffer.from([DataType.Date]));
    buffer.push(serializeNumber(input.getTime()));
  } else if (typeof input === "object") {
    buffer.push(Buffer.from([DataType.Object]));
  } else {
    throw new Error(`Unknown type ${typeof input}`);
  }

  return buffer;
}

export function serialize<T>(a: T): Buffer {
  return Buffer.concat(_serialize(a));
}

export function deserialize<T>(buffer: Buffer): T {
  function consumeRead(length: number): Buffer {
    const result = buffer.subarray(0, length);

    buffer = buffer.subarray(length);
    return result;
  }

  switch (consumeRead(1)[0]) {
    case DataType.EmptyString:
      return "" as T;
    case DataType.String:
      return deserializeString(consumeRead(buffer.length)) as T;
    case DataType.ZeroNumber:
      return 0 as T;
    case DataType.NegativeNumber:
      return -deserializeNumber(consumeRead(4)) as T;
    case DataType.Number:
      return deserializeNumber(consumeRead(4)) as T;
    case DataType.ZeroFloatNumber:
      return 0 as T;
    case DataType.NegativeFloatNumber:
      return -deserializeFloat(consumeRead(buffer[1])) as T;
    case DataType.FloatNumber:
      return deserializeFloat(consumeRead(buffer[1])) as T;
    case DataType.BigNumber:
      return deserializeNumber(consumeRead(buffer[1])) as T;
    case DataType.True:
      return true as T;
    case DataType.False:
      return false as T;
    case DataType.Null:
      return null as T;
    case DataType.Undefined:
      return undefined as T;
    case DataType.Array:
      return deserializeArray(consumeRead(buffer.length)) as T;
    case DataType.Date:
      return new Date(deserializeNumber(consumeRead(4))) as T;

    default:
      throw new Error(`Invalid data type: ${consumeRead(1)[0]}`);
  }
}
