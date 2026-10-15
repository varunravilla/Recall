import { MongoServerError, type Collection, type Db } from "mongodb";

export class EmptyContent extends Error {}
export class AlreadyCollected extends Error {}
export class NotOwner extends Error {}

interface CollectionRow {
  _id: string;
  owner: string;
  item: string;
  content: string;
  collectedAt: Date;
}

export class CollectingConcept {
  private readonly collections: Collection<CollectionRow>;
  private indexed = false;

  constructor(db: Db) {
    this.collections = db.collection<CollectionRow>("collecting.collections");
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.collections.createIndex({ owner: 1, item: 1 }, { unique: true });
    this.indexed = true;
  }

  async add({
    user,
    item,
    content,
    collectedAt,
  }: {
    user: string;
    item: string;
    content: string;
    collectedAt: Date;
  }) {
    await this.#ensureIndex();
    if (content.trim().length === 0) {
      throw new EmptyContent("Caption cannot be empty.");
    }
    const collection = crypto.randomUUID();
    try {
      await this.collections.insertOne({
        _id: collection,
        owner: user,
        item,
        content,
        collectedAt,
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new AlreadyCollected("This item is already in the collection.");
      }
      throw error;
    }
    return { collection };
  }

  async remove({ user, collection }: { user: string; collection: string }) {
    await this.#ensureIndex();
    const result = await this.collections.deleteOne({ _id: collection, owner: user });
    if (result.deletedCount === 0) {
      throw new NotOwner("You do not own this collection.");
    }
    return { collection };
  }

  async _byOwner({ user }: { user: string }) {
    await this.#ensureIndex();
    const rows = await this.collections.find({ owner: user }).sort({ collectedAt: 1 }).toArray();
    return rows.map(({ _id, item, content, collectedAt }) => ({
      collection: _id,
      item,
      content,
      collectedAt,
    }));
  }

  async _byId({ collection }: { collection: string }) {
    await this.#ensureIndex();
    const row = await this.collections.findOne({ _id: collection });
    if (row === null) return [];
    return [
      {
        owner: row.owner,
        item: row.item,
        content: row.content,
        collectedAt: row.collectedAt,
      },
    ];
  }
}
