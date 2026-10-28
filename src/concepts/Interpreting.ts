import { instant } from "../input.ts";
import { type Collection, type Db } from "mongodb";

export class NotProposed extends Error {}

interface InterpretationRow {
  _id: string;
  item: string;
  kind: string;
  summary: string;
  relevantAt?: Date;
  status: string;
  createdAt: Date;
}

export class InterpretingConcept {
  private readonly interpretations: Collection<InterpretationRow>;
  private indexed = false;

  constructor(db: Db) {
    this.interpretations = db.collection<InterpretationRow>("interpreting.interpretations");
  }

  async #ensureIndex() {
    if (this.indexed) return;
    await this.interpretations.createIndex({ item: 1, createdAt: -1 });
    this.indexed = true;
  }

  async propose({
    item,
    kind,
    summary,
    relevantAt,
  }: {
    item: string;
    kind: string;
    summary: string;
    relevantAt?: Date;
  }) {
    if (relevantAt !== undefined) relevantAt = instant(relevantAt);
    await this.#ensureIndex();
    const interpretation = crypto.randomUUID();
    await this.interpretations.insertOne({
      _id: interpretation,
      item,
      kind,
      summary,
      relevantAt,
      status: "proposed",
      createdAt: new Date(),
    });
    return { interpretation };
  }

  async confirm({ interpretation }: { interpretation: string }) {
    await this.#ensureIndex();
    const changed = await this.interpretations.updateOne(
      { _id: interpretation, status: "proposed" }, { $set: { status: "confirmed" } },
    );
    if (!changed.matchedCount) {
      throw new NotProposed("Only a proposed interpretation can be confirmed.");
    }
    return { interpretation };
  }

  async revise({
    interpretation,
    kind,
    summary,
    relevantAt,
  }: {
    interpretation: string;
    kind: string;
    summary: string;
    relevantAt?: Date;
  }) {
    await this.#ensureIndex();
    if (relevantAt !== undefined) relevantAt = instant(relevantAt);
    const changed = await this.interpretations.updateOne(
      { _id: interpretation, status: "proposed" },
      { $set: { kind, summary, relevantAt } },
    );
    if (!changed.matchedCount) throw new NotProposed("Only a proposed interpretation can be revised.");
    return { interpretation };
  }

  async reject({ interpretation }: { interpretation: string }) {
    await this.#ensureIndex();
    const changed = await this.interpretations.updateOne(
      { _id: interpretation, status: "proposed" }, { $set: { status: "rejected" } },
    );
    if (!changed.matchedCount) {
      throw new NotProposed("Only a proposed interpretation can be rejected.");
    }
    return { interpretation };
  }

  async remove({ interpretation }: { interpretation: string }) {
    await this.interpretations.deleteOne({ _id: interpretation });
    return { interpretation };
  }

  async _allByItem({ item }: { item: string }) {
    const rows = await this.interpretations.find({ item }, { projection: { _id: 1 } }).toArray();
    return rows.map(row => ({ interpretation: row._id }));
  }

  async _byItem({ item }: { item: string }) {
    await this.#ensureIndex();
    const row = await this.interpretations.findOne({ item }, { sort: { createdAt: -1 } });
    if (row === null) return [];
    return [
      {
        interpretation: row._id,
        kind: row.kind,
        summary: row.summary,
        relevantAt: row.relevantAt ?? null,
        status: row.status,
      },
    ];
  }

  async _byId({ interpretation }: { interpretation: string }) {
    await this.#ensureIndex();
    const row = await this.interpretations.findOne({ _id: interpretation });
    if (row === null) return [];
    return [
      {
        item: row.item,
        kind: row.kind,
        summary: row.summary,
        relevantAt: row.relevantAt ?? null,
        status: row.status,
      },
    ];
  }
}
