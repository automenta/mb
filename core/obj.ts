import { JSONValue, JSONType, UpdateEncoderV1, UpdateEncoderAny } from "yjs";
import { generateKeyPairSync, createSign, createVerify } from "node:crypto";

import * as Y from "yjs";
import { uuidv4 } from "lib0/random";

// Define metadata structure
interface Metadata {
  [key: string]: JSONValue;
}

// Define links structure
interface Links {
  [key: string]: string; // Assuming links are stored as strings
}

// NObject represents an object in the system.
class NObject {
  public readonly id: string;
  private doc: Y.Doc;
  private readonly metadata: Y.Map<JSONValue>;
  private text: Y.Text;
  private readonly links: Y.Map<string>;

  constructor(doc: Y.Doc, id?: string) {
    this.id = id ? id : uuidv4();
    this.doc = doc;

    this.metadata = doc.getMap<JSONValue>(`metadata-${this.id}`);
    this.text = doc.getText(`text-${this.id}`);
    this.links = doc.getMap<string>(`links-${this.id}`);
  }

  // getMetadata retrieves a specific metadata value by key.
  getMetadata(key: string): JSONValue | undefined {
    return this.metadata.get(key);
  }

  // setMetadata sets a specific metadata key-value pair.
  setMetadata(key: string, value: JSONValue): void {
    this.metadata.set(key, value);
  }

  // getAllMetadata retrieves all metadata as a plain object.
  getAllMetadata(): Metadata {
    return this.metadata.toJSON();
  }

  // Metadata-related methods
  get name(): string | undefined {
    return this.metadata.get("name") as string | undefined;
  }

  set name(value: string | undefined) {
    if (value) {
      this.metadata.set("name", value);
    } else {
      this.metadata.delete("name");
    }
  }

  // Text-related methods
  get textContent(): string {
    return this.text.toString();
  }

  set textContent(value: string) {
    if (this.textContent !== value) {
      this.doc.transact(() => {
        this.text.delete(0, this.text.length); // Clear existing text
        this.text.insert(0, value); // Insert new text
      });
    }
  }

  // Links-related methods
  get linksContent(): Links {
    return this.links.toJSON();
  }

  addLink(key: string, targetId: string): void {
    this.links.set(key, targetId);
  }

  removeLink(key: string): void {
    this.links.delete(key);
  }

  // Tags-related methods
  get tags(): string[] {
    const tagsValue = this.metadata.get("tags");
    if (Array.isArray(tagsValue)) {
      return tagsValue.filter((tag): tag is string => typeof tag === "string");
    }
    return [];
  }

  set tags(tags: string[]) {
    this.metadata.set("tags", tags as JSONValue);
  }

  addTag(tag: string): void {
    const currentTags = this.tags;
    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
      this.tags = currentTags;
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  // Replies-related methods
  get replies(): string[] {
    const repliesValue = this.metadata.get("replies");
    return Array.isArray(repliesValue)
      ? repliesValue.filter((id): id is string => typeof id === "string")
      : [];
  }

  addReply(replyId: string): void {
    const currentReplies = this.replies;
    if (!currentReplies.includes(replyId)) {
      currentReplies.push(replyId);
      this.metadata.set("replies", currentReplies as JSONValue);
    }
  }

  removeReply(replyId: string): void {
    this.metadata.set(
      "replies",
      this.replies.filter((id) => id !== replyId) as JSONValue
    );
  }

  // RepliesTo-related methods
  get repliesTo(): string[] {
    const repliesToValue = this.metadata.get("repliesTo");
    return Array.isArray(repliesToValue)
      ? repliesToValue.filter((id): id is string => typeof id === "string")
      : [];
  }

  addReplyTo(objectId: string): void {
    const currentRepliesTo = this.repliesTo;
    if (!currentRepliesTo.includes(objectId)) {
      currentRepliesTo.push(objectId);
      this.metadata.set("repliesTo", currentRepliesTo as JSONValue);
    }
  }

  removeReplyTo(objectId: string): void {
    this.metadata.set(
      "repliesTo",
      this.repliesTo.filter((id) => id !== objectId) as JSONValue
    );
  }

  async verifySignature(): Promise<boolean> {
    const signature = this.getMetadata("signature") as string;
    const publicKey = JSON.parse(this.getMetadata("publicKey") as string);
    if (!signature || !publicKey) return false;

    const dataToVerify = this.getDataToSign();
    const verify = createVerify("SHA256");
    verify.update(dataToVerify);
    verify.end();

    const jwk = {
      ...publicKey,
      alg: "RS256", // Specify the algorithm here
    };

    return verify.verify(jwk, signature, "base64");
  }

  observe(callback: (event: Y.YMapEvent<JSONValue>) => void): () => void {
    const observer = (event: Y.YMapEvent<JSONValue>) => {
      callback(event);
    };
    this.metadata.observe(observer);
    return () => this.metadata.unobserve(observer);
  }

  // toJSON returns a plain JavaScript object representation of the NObject.
  toJSON(): { metadata: Metadata; content: string; links: Links } {
    return {
      metadata: this.getAllMetadata(),
      content: this.textContent,
      links: this.linksContent,
    };
  }

  private getDataToSign(): string {
    // Exclude signature and publicKey from the data that is signed
    const metadataToSign = this.getAllMetadata();
    delete metadataToSign["signature"];
    delete metadataToSign["publicKey"];

    // Include other relevant data in the signature
    return JSON.stringify({
      metadata: metadataToSign,
      content: this.textContent,
      links: this.linksContent,
    });
  }

  async generateKeyPair() {
    const keyPair = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "jwk",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "jwk",
      },
    });

    this.setMetadata("publicKey", JSON.stringify(keyPair.publicKey));
    return keyPair;
  }

  async sign(privateKey: any) {
    const dataToSign = this.getDataToSign();
    const sign = createSign("SHA256");
    sign.update(dataToSign);
    sign.end();
    const signature = sign.sign(privateKey, "base64");
    this.setMetadata("signature", signature);
  }
}

export default NObject;