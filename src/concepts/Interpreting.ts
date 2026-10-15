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
    const row = await this.interpretations.findOne({ _id: interpretation });
    if (row === null || row.status !== "proposed") {
      throw new NotProposed("Only a proposed interpretation can be confirmed.");
    }
    await this.interpretations.updateOne({ _id: interpretation }, { $set: { status: "confirmed" } });
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
    const row = await this.interpretations.findOne({ _id: interpretation });
    if (row === null || row.status !== "proposed") {
      throw new NotProposed("Only a proposed interpretation can be revised.");
    }
    await this.interpretations.updateOne(
      { _id: interpretation },
      { $set: { kind, summary, relevantAt } },
    );
    return { interpretation };
  }

  async reject({ interpretation }: { interpretation: string }) {
    await this.#ensureIndex();
    const row = await this.interpretations.findOne({ _id: interpretation });
    if (row === null || row.status !== "proposed") {
      throw new NotProposed("Only a proposed interpretation can be rejected.");
    }
    await this.interpretations.updateOne({ _id: interpretation }, { $set: { status: "rejected" } });
    return { interpretation };
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
        relevantAt: row.relevantAt ?? row.createdAt,
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
        relevantAt: row.relevantAt ?? row.createdAt,
        status: row.status,
      },
    ];
  }
}
