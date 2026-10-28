import { createFileRoute } from '@tanstack/react-router';
import type { SubmitEventHandler } from 'react';
import { useState } from 'react';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [metal, setMetal] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [purity, setPurity] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');

  const onAddSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    alert(JSON.stringify(Object.fromEntries(data)));

    // TODO: positive weight check > 0
  };

  return (
    <main className="w-11/12 mx-auto mt-4 flex flex-col items-center gap-8">
      <h1 className="font-bold text-4xl">StackFolio 2</h1>

      {/*
        AC: add eight 0.25 troy ounce items, reload, and see them with 2 troy oz total weight.

        Need a basic form to collect the items: metal type, weight, weight_unit, purity, quantity, and optional holding_type
      */}
      <form className="flex flex-col gap-4 text-xl" onSubmit={onAddSubmit}>
        <div className="flex gap-2">
          <label htmlFor="metal">Metal:</label>
          <select
            required
            name="metal"
            id="metal"
            value={metal}
            onChange={(e) => {
              const value = e.target.value;
              setPurity('');
              setMetal(value);
            }}
          >
            <option value="">Choose a metal</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
          </select>
        </div>

        <div className="flex gap-2">
          <label htmlFor="weight-unit">Weight unit:</label>
          <select
            required
            name="weight_unit"
            id="weight-unit"
            value={weightUnit}
            onChange={(e) => {
              const value = e.target.value;
              setWeightUnit(value);
            }}
          >
            <option value="">Choose unit</option>
            <option value="gram">gram</option>
            <option value="ozt">troy ounce</option>
          </select>
        </div>

        <div className="flex gap-2">
          <label htmlFor="weight">Weight per item:</label>
          <input
            required
            name="weight"
            id="weight"
            type="number"
            placeholder="Enter weight"
            min="0"
            step="any"
            value={weight}
            onChange={(e) => {
              const value = e.target.value;
              setWeight(value);
            }}
          />
        </div>

        <div className="flex gap-2">
          <label htmlFor="purity">Purity:</label>
          <select
            disabled={metal === ''}
            required
            name="purity"
            id="purity"
            value={purity}
            onChange={(e) => {
              const value = e.target.value;
              setPurity(value);
            }}
          >
            <option value="">Choose purity</option>

            {metal === 'gold' ? (
              <>
                <option value={9 / 24}>9K</option>
                <option value={14 / 24}>14K</option>
                <option value={18 / 24}>18K</option>
                <option value={24 / 24}>24K (100%, nominal)</option>
                <option value={0.999}>Fine gold (.999)</option>
                <option value={0.9999}>Fine gold (.9999)</option>
              </>
            ) : (
              <>
                <option value="0.925">Sterling silver (.925)</option>
                <option value="0.999">Fine silver (.999)</option>
                <option value="0.9999">Fine silver (.9999)</option>
              </>
            )}
          </select>
        </div>

        <div className="flex gap-2">
          <label htmlFor="quantity">Quantity:</label>
          <input
            required
            name="quantity"
            id="quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => {
              const value = e.target.value;
              setQuantity(value);
            }}
          />
        </div>

        <div className="flex gap-2">
          <label htmlFor="holding-type">Holding type:</label>
          <select name="holding_type" id="holding-type">
            <option value="">None selected</option>
          </select>
        </div>

        <button
          type="submit"
          className="border border-black box-border py-2 px-4 bg-gray-100 hover:cursor-pointer hover:bg-gray-200"
        >
          Add
        </button>
      </form>
    </main>
  );
}
