import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import type { SubmitEventHandler } from 'react';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import * as z from 'zod';

const metals = ['gold', 'silver'] as const;
type Metal = (typeof metals)[number];

const weightUnits = ['ozt', 'gram'] as const;
type WeightUnit = (typeof weightUnits)[number];

const holdingTypes = ['coin', 'bar', 'round', 'jewelry'] as const;
type HoldingType = (typeof holdingTypes)[number];

// TODO: move to types file
interface CreateHoldingInput {
  metal: Metal;
  weight_unit: WeightUnit;
  weight: number;
  purity: number;
  quantity: number;
  holding_type: HoldingType | null;
}

// TODO: move to types file
interface Holding extends CreateHoldingInput {
  id: string;
}

const schema = z.object({
  metal: z.enum(metals),
  weight_unit: z.enum(weightUnits),
  weight: z.number().positive(),
  purity: z.number().positive().max(1),
  quantity: z.number().int().positive(),
  holding_type: z.enum(holdingTypes).nullable(),
});

type FormValues = z.infer<typeof schema>;

// TODO: move to lib
const backendUrlPath = import.meta.env.VITE_API_URL;

// TODO: move to lib
const gramsToTroyOunces = (gramWeightUnit: number) => {
  // 1 troy ounce = 31.1034768 grams
  return gramWeightUnit / 31.1034768;
};

// TODO: move to lib
const formatUsd = (value: number) => {
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// TODO: move to lib
const calculateHoldingValue = ({ weight_unit, weight, purity, quantity }: Holding, spotPrice: number): number => {
  const weightOzt = weight_unit === 'gram' ? gramsToTroyOunces(weight) : weight;

  return weightOzt * purity * quantity * spotPrice;
};

// TODO: move to lib
const calculateStackValue = (
  holdings: Holding[],
  spotPrices: Record<'gold' | 'silver', number | undefined>,
): number | undefined => {
  let stackValue = 0;
  for (const holding of holdings) {
    const spotPrice = spotPrices[holding.metal];
    if (spotPrice === undefined) return undefined;
    stackValue += calculateHoldingValue(holding, spotPrice);
  }

  return stackValue;
};

// TODO: move to lib
const fetchSpotPrices = async () => {
  const res = await fetch(`${backendUrlPath}/spot-prices`);
  if (!res.ok) {
    throw new Error(`Could not fetch spot prices.`);
  }
  const data = (await res.json()) as { timestamp: string; prices: { gold: number; silver: number } };
  return data;
};

// TODO: move to a custom hook and API lib files
const fetchAllHoldings = async (): Promise<Holding[]> => {
  // TODO: show user-facing API validation messages on submit; keep unexpected errors generic.
  const res = await fetch(`${backendUrlPath}/holdings`, { headers: { 'Content-Type': 'application/json' } });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw Error(typeof message === 'string' && message.trim() ? message : 'Could not load holdings.');
  }
  return data;
};

// TODO: move to a custom hook and API lib files
const createHolding = async (payload: CreateHoldingInput): Promise<Holding> => {
  // TODO: show user-facing API validation messages on submit; keep unexpected errors generic.
  const res = await fetch(`${backendUrlPath}/holdings`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(typeof message === 'string' && message.trim() ? message : 'Could not create holding.');
  }
  return data;
};

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  // TODO: add ReactHookForm
  const [metal, setMetal] = useState<CreateHoldingInput['metal'] | ''>('');
  const [weightUnit, setWeightUnit] = useState<CreateHoldingInput['weight_unit'] | ''>('');
  const [weight, setWeight] = useState<string>('');
  const [purity, setPurity] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [holdingType, setHoldingType] = useState<HoldingType | ''>('');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isHoldingsLoading, setIsHoldingsLoading] = useState<boolean>(true);
  const [holdingsError, setHoldingsError] = useState<string>('');
  const [isCreatingHoldingLoading, setIsCreatingHoldingLoading] = useState<boolean>(false);
  const [creatingHoldingError, setCreatingHoldingError] = useState<string>('');
  const [goldSpotPrice, setGoldSpotPrice] = useState<number | undefined>(undefined);
  const [silverSpotPrice, setSilverSpotPrice] = useState<number | undefined>(undefined);
  const [isSpotPricesLoading, setIsSpotPricesLoading] = useState<boolean>(true);
  const [spotPricesError, setSpotPricesError] = useState<string>('');
  const [spotPricesTimestamp, setSpotPricesTimestamp] = useState<string>(''); // TODO: simply spot price state

  const {
    register,
    handleSubmit,
    formState: {errors}
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // TODo: move to custom hook file
  useEffect(() => {
    async function getAllHoldings() {
      try {
        setIsHoldingsLoading(true);
        const fetchedHoldings = await fetchAllHoldings();
        setHoldings(fetchedHoldings);
      } catch {
        setHoldingsError("Couldn't load your holdings. Reload the page and try again.");
      } finally {
        setIsHoldingsLoading(false);
      }
    }

    async function getSpotPrices() {
      try {
        setIsSpotPricesLoading(true);
        const fetchedSpotPrices = await fetchSpotPrices();
        setGoldSpotPrice(fetchedSpotPrices.prices.gold);
        setSilverSpotPrice(fetchedSpotPrices.prices.silver);
        setSpotPricesTimestamp(fetchedSpotPrices.timestamp);
      } catch {
        setSpotPricesError('Could not load spot prices. Reload the page and try again.');
      } finally {
        setIsSpotPricesLoading(false);
      }
    }

    getAllHoldings();
    getSpotPrices();

    // TODO: add effect cleanup to ignore results after unmount.
  }, []);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    alert(data);
  }

  const onAddSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (metal === '' || weightUnit === '') return;

    const parsedWeight = Number(weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setCreatingHoldingError('Weight must be greater than zero.');
      return;
    }

    const payload: CreateHoldingInput = {
      metal,
      weight: parsedWeight,
      weight_unit: weightUnit,
      purity: Number(purity),
      quantity: Number(quantity),
      holding_type: holdingType || null,
    };

    try {
      setCreatingHoldingError('');
      setIsCreatingHoldingLoading(true);
      const savedHolding = await createHolding(payload);
      setHoldings((currentHoldings) => [...currentHoldings, savedHolding]);
    } catch {
      setCreatingHoldingError('Could not create holding. Please try again');
    } finally {
      setIsCreatingHoldingLoading(false);
    }
  };

  const stackValue = calculateStackValue(holdings, {
    gold: goldSpotPrice,
    silver: silverSpotPrice,
  });
  let stackValueText = 'Unavailable';
  if (isHoldingsLoading) {
    stackValueText = 'Loading...';
  } else if (!holdingsError) {
    if (holdings.length > 0 && isSpotPricesLoading) {
      stackValueText = 'Loading...';
    } else if (stackValue !== undefined && (holdings.length === 0 || !spotPricesError)) {
      stackValueText = formatUsd(stackValue);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <h1 className="font-bold text-4xl">StackFolio 2</h1>

      <div className="flex w-full max-w-md flex-col gap-1 rounded-md border border-gray-300 p-4">
        <h2 className="font-bold text-2xl">Total Stack Value: {stackValueText}</h2>
        <p className="text-gray-500">
          Based on weight, purity, quantity, and spot price. Actual resale value may differ.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {isHoldingsLoading ? (
          <p>loading...</p>
        ) : holdingsError ? (
          <p>{holdingsError}</p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {holdings.length > 0 ? (
              holdings.map((holding) => {
                const { id, metal, weight_unit, weight, purity, quantity, holding_type } = holding;
                const spotPrice = metal === 'gold' ? goldSpotPrice : silverSpotPrice;

                return (
                  <div key={id} className="rounded-md border border-gray-300 p-4">
                    <h2 className="text-lg font-semibold capitalize">{metal}</h2>
                    <p>
                      Weight: {weight} {weight_unit}
                    </p>
                    <p>Purity: {purity}</p>
                    <p>Quantity: {quantity}</p>
                    <p>
                      Total weight: {weight * quantity} {weight_unit}
                    </p>
                    {holding_type && <p>{holding_type}</p>}
                    {isSpotPricesLoading ? (
                      <p>Holding value: loading...</p>
                    ) : spotPricesError ? (
                      <p>{spotPricesError}</p>
                    ) : spotPrice !== undefined ? (
                      <>
                        <p className="mt-2 text-sm text-gray-500 wrap-break-word">
                          Price snapshot: {new Date(spotPricesTimestamp).toISOString()}
                        </p>

                        <p className="mt-3 font-semibold">
                          Holding value: {formatUsd(calculateHoldingValue(holding, spotPrice))}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 font-semibold">Holding value: Unavailable</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No holdings yet. Add your first holding below.</p>
            )}
          </div>
        )}

        {/* TODO: move to its own component */}
        <form
          aria-disabled={isCreatingHoldingLoading}
          className="flex flex-col gap-4 text-xl"
          onSubmit={handleSubmit(onSubmit)}
        >
          <h2 className="font-bold text-xl">Add holding</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="metal">Metal:</label>
            <select
              required
              name="metal"
              id="metal"
              value={metal}
              onChange={(e) => {
                const value = e.target.value;
                if (value == '' || value === 'gold' || value === 'silver') {
                  setPurity('');
                  setMetal(value);
                }
              }}
              disabled={isCreatingHoldingLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Choose a metal</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="weight-unit">Weight unit:</label>
            <select
              required
              name="weight_unit"
              id="weight-unit"
              value={weightUnit}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'gram' || value === 'ozt' || value === '') setWeightUnit(value);
              }}
              disabled={isCreatingHoldingLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Choose unit</option>
              <option value="gram">gram</option>
              <option value="ozt">troy ounce</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
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
              disabled={isCreatingHoldingLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="purity">Purity:</label>
            <select
              required
              name="purity"
              id="purity"
              value={purity}
              onChange={(e) => {
                const value = e.target.value;
                setPurity(value);
              }}
              disabled={metal === '' || isCreatingHoldingLoading}
              autoComplete="off"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
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

          <div className="flex flex-col gap-1">
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
              disabled={isCreatingHoldingLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="holding-type">Holding type:</label>
            <select
              name="holding_type"
              id="holding-type"
              disabled={isCreatingHoldingLoading}
              value={holdingType}
              onChange={(e) => {
                const value = e.target.value;
                const selected = holdingTypes.find((type) => type === value);
                setHoldingType(selected ?? '');
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">None selected</option>
              {holdingTypes.map((type) => (
                <option key={type} value={type}>
                  {type[0].toUpperCase() + type.substring(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isCreatingHoldingLoading}
          >
            {isCreatingHoldingLoading ? 'Adding...' : 'Add'}
          </button>

          <p role="alert" aria-atomic="true">
            {creatingHoldingError}
          </p>
        </form>
      </div>
    </main>
  );
}
