import { type Collection, type Db } from "mongodb";

export class AlreadyTracking extends Error {}
export class NotOwner extends Error {}
export class NotPending extends Error {}

interface TrackingRow {
  _id: string;
  owner: string;
  item: string;
  status: string;
}

export class TrackingConcept {
  private readonly trackings: Collection<TrackingRow>;
  private indexed = false;

  constructor(db: Db) {
    this.trackings = db.collection<TrackingRow>("tracking.trackings");
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.trackings.createIndex(
      { owner: 1, item: 1, status: 1 },
      { unique: true, partialFilterExpression: { status: "pending" } },
    );
    this.indexed = true;
  }

  async track({ user, item }: { user: string; item: string }) {
    await this.#ensureIndex();
    const tracking = crypto.randomUUID();
    try {
      await this.trackings.insertOne({
        _id: tracking,
        owner: user,
        item,
        status: "pending",
      });
    } catch (error) {
      const existing = await this.trackings.findOne({ owner: user, item, status: "pending" });
      if (existing !== null) {
        throw new AlreadyTracking("This item is already being tracked.");
      }
      throw error;
    }
    return { tracking };
  }

  async complete({ user, tracking }: { user: string; tracking: string }) {
    await this.#ensureIndex();
    const row = await this.trackings.findOne({ _id: tracking });
    if (row === null || row.owner !== user) {
      throw new NotOwner("You do not own this tracking.");
    }
    if (row.status !== "pending") {
      throw new NotPending("Only a pending tracking can be completed.");
    }
    await this.trackings.updateOne({ _id: tracking }, { $set: { status: "completed" } });
    return { tracking };
  }

  async dismiss({ user, tracking }: { user: string; tracking: string }) {
    await this.#ensureIndex();
    const row = await this.trackings.findOne({ _id: tracking });
    if (row === null || row.owner !== user) {
      throw new NotOwner("You do not own this tracking.");
    }
    if (row.status !== "pending") {
      throw new NotPending("Only a pending tracking can be dismissed.");
    }
    await this.trackings.updateOne({ _id: tracking }, { $set: { status: "dismissed" } });
    return { tracking };
  }

  async remove({ user, tracking }: { user: string; tracking: string }) {
    const result = await this.trackings.deleteOne({ _id: tracking, owner: user });
    if (!result.deletedCount) throw new NotOwner("You do not own this tracking.");
    return { tracking };
  }

  async _allByItem({ item }: { item: string }) {
    const rows = await this.trackings.find({ item }, { projection: { _id: 1, owner: 1 } }).toArray();
    return rows.map(row => ({ tracking: row._id, owner: row.owner }));
  }

  async _pending({ user }: { user: string }) {
    await this.#ensureIndex();
    const rows = await this.trackings.find({ owner: user, status: "pending" }).toArray();
    return rows.map(({ _id, item }) => ({ tracking: _id, item }));
  }

  async _byItem({ user, item }: { user: string; item: string }) {
    await this.#ensureIndex();
    const row = await this.trackings.findOne({ owner: user, item }, { sort: { _id: -1 } });
    if (row === null) return [];
    return [{ tracking: row._id, status: row.status }];
  }

  async _byId({ tracking }: { tracking: string }) {
    await this.#ensureIndex();
    const row = await this.trackings.findOne({ _id: tracking });
    if (row === null) return [];
    return [{ owner: row.owner, item: row.item, status: row.status }];
  }
}
