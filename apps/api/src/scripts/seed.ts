import 'reflect-metadata';
import assert from 'node:assert/strict';

import { DataSource } from 'typeorm';

import { databaseOptions } from '../database-options.js';
import { ItemType } from '../inventory/entities/item-type.entity.js';
import { itemTypePresets } from '../inventory/item-type-presets.js';

const dataSource = new DataSource(databaseOptions);

try {
  await dataSource.initialize();
  const inserted = await dataSource.transaction(async (manager) => {
    // Serialize seed runs so checking for a missing preset cannot race an insert.
    await manager.query('LOCK TABLE item_types IN SHARE ROW EXCLUSIVE MODE');
    const repository = manager.getRepository(ItemType);
    let count = 0;

    // shortcut: names identify presets; use stable catalog keys before renaming them.
    for (const preset of itemTypePresets) {
      const existing = await repository.findBy({ name: preset.name });
      assert(existing.length <= 1, `Duplicate preset: ${preset.name}`);
      if (existing.length === 1) {
        const { id: _id, ...definition } = existing[0]!;
        assert.deepEqual(definition, preset, `Conflicting preset: ${preset.name}`);
      } else {
        await repository.insert(preset);
        count++;
      }
    }

    for (const preset of itemTypePresets) {
      assert.equal(await repository.countBy(preset), 1, `Invalid preset: ${preset.name}`);
    }
    return count;
  });
  console.log(`Inserted ${inserted} presets; verified ${itemTypePresets.length}.`);
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
