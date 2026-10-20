import { type Collection, type Db } from "mongodb";

export class NotOwner extends Error {}
export class NotScheduled extends Error {}
export class NotYet extends Error {}
export class NotDue extends Error {}

interface ReminderRow {
  _id: string;
  owner: string;
  item: string;
  at: Date;
  status: string;
}

export class RemindingConcept {
  private readonly reminders: Collection<ReminderRow>;
  private indexed = false;

  constructor(db: Db) {
    this.reminders = db.collection<ReminderRow>("reminding.reminders");
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.reminders.createIndex({ status: 1, at: 1 });
    await this.reminders.createIndex({ owner: 1, item: 1, status: 1 });
    this.indexed = true;
  }

  async schedule({ user, item, at }: { user: string; item: string; at: Date }) {
    await this.#ensureIndex();
    const reminder = crypto.randomUUID();
    await this.reminders.insertOne({
      _id: reminder,
      owner: user,
      item,
      at,
      status: "scheduled",
    });
    return { reminder };
  }

  async reschedule({ user, reminder, at }: { user: string; reminder: string; at: Date }) {
    await this.#ensureIndex();
    const row = await this.reminders.findOne({ _id: reminder });
    if (row === null || row.owner !== user) {
      throw new NotOwner("You do not own this reminder.");
    }
    if (row.status !== "scheduled") {
      throw new NotScheduled("Only a scheduled reminder can be rescheduled.");
    }
    await this.reminders.updateOne({ _id: reminder }, { $set: { at } });
    return { reminder };
  }

  async cancel({ user, reminder }: { user: string; reminder: string }) {
    await this.#ensureIndex();
    const row = await this.reminders.findOne({ _id: reminder });
    if (row === null || row.owner !== user) {
      throw new NotOwner("You do not own this reminder.");
    }
    await this.reminders.updateOne({ _id: reminder }, { $set: { status: "cancelled" } });
    return { reminder };
  }

  async due({ reminder, now }: { reminder: string; now: Date }) {
    await this.#ensureIndex();
    const row = await this.reminders.findOne({ _id: reminder });
    if (row === null || row.status !== "scheduled") {
      throw new NotScheduled("This reminder is not scheduled.");
    }
    if (now.getTime() < row.at.getTime()) {
      throw new NotYet("It is not time for this reminder yet.");
    }
    await this.reminders.updateOne({ _id: reminder }, { $set: { status: "due" } });
    return { reminder };
  }

  async sweepDue({ now }: { now: Date }) {
    await this.#ensureIndex();
    const dueRows = await this.reminders
      .find({ status: "scheduled", at: { $lte: now } })
      .toArray();
    if (dueRows.length === 0) return { count: 0 };
    await this.reminders.updateMany(
      { status: "scheduled", at: { $lte: now } },
      { $set: { status: "due" } },
    );
    return { count: dueRows.length };
  }

  async acknowledge({ user, reminder }: { user: string; reminder: string }) {
    await this.#ensureIndex();
    const row = await this.reminders.findOne({ _id: reminder });
    if (row === null || row.owner !== user) {
      throw new NotOwner("You do not own this reminder.");
    }
    if (row.status !== "due") {
      throw new NotDue("Only a due reminder can be acknowledged.");
    }
    await this.reminders.updateOne({ _id: reminder }, { $set: { status: "acknowledged" } });
    return { reminder };
  }

  async removeItem({ user, item }: { user: string; item: string }) {
    await this.reminders.deleteMany({ owner: user, item });
    return { item };
  }

  async _byItem({ user, item }: { user: string; item: string }) {
    await this.#ensureIndex();
    const row = await this.reminders.findOne(
      { owner: user, item, status: { $in: ["scheduled", "due"] } },
      { sort: { at: 1 } },
    );
    if (row === null) return [];
    return [{ reminder: row._id, at: row.at, status: row.status }];
  }

  async _scheduledBefore({ now }: { now: Date }) {
    await this.#ensureIndex();
    const rows = await this.reminders
      .find({ status: "scheduled", at: { $lte: now } })
      .toArray();
    return rows.map(({ _id, owner, item, at }) => ({
      reminder: _id,
      owner,
      item,
      at,
    }));
  }
}
