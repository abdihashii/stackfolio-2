import { createFileRoute } from '@tanstack/react-router';
import type { SubmitEventHandler } from 'react';
import { useEffect, useState } from 'react';

// TODO: move to lib
const backendUrlPath = import.meta.env.VITE_API_URL;

// TODO: move to types file
interface CreateHoldingInput {
  metal: 'gold' | 'silver';
  weight_unit: 'gram' | 'ozt';
  weight: number;
  purity: number;
  quantity: number;
  holding_type: string | null;
}

// TODO: move to types file
interface Holding extends CreateHoldingInput {
  id: string;
}

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
  const [holdingType, setHoldingType] = useState<string>('');
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

    // TODO: refresh holdings after succesful POST
    try {
      setCreatingHoldingError('');
      setIsCreatingHoldingLoading(true);
      const data = await createHolding(payload);
      console.log(data);
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
  if (holdings.length > 0 && isSpotPricesLoading) {
    stackValueText = 'Loading...';
  } else if (stackValue !== undefined && (holdings.length === 0 || !spotPricesError)) {
    stackValueText = formatUsd(stackValue);
  }

  return (
    <main className="w-11/12 mx-auto mt-4 flex flex-col items-center gap-8">
      <h1 className="font-bold text-4xl">StackFolio 2</h1>

      <div className="flex flex-col gap-1 items-center">
        <h2 className='font-bold text-2xl'>Total Stack Value: {stackValueText}</h2>
        <p className="text-gray-500">Based on weight, purity, quantity, and spot price. Actual resale value may differ.</p>
      </div>

      {isHoldingsLoading ? (
        <p>loading...</p>
      ) : holdingsError ? (
        <p>{holdingsError}</p>
      ) : (
        <div className="flex flex-col gap-4 items-center">
          {/* TODO: move to its own component */}
          <div className="flex gap-2">
            {holdings.length > 0 ? (
              holdings.map((holding) => {
                const { id, metal, weight_unit, weight, purity, quantity } = holding;
                const spotPrice = metal === 'gold' ? goldSpotPrice : silverSpotPrice;

                return (
                  <div key={id} className="border border-black p-2">
                    <p>{metal}</p>
                    <p>
                      {weight} {weight_unit}
                    </p>
                    <p>{purity}</p>
                    <p>{quantity}</p>
                    <p>
                      Total weight: {weight * quantity} {weight_unit}
                    </p>
                    {isSpotPricesLoading ? (
                      <p>Holding value: loading...</p>
                    ) : spotPricesError ? (
                      <p>{spotPricesError}</p>
                    ) : spotPrice !== undefined ? (
                      <>
                        <p>Price snapshot: {new Date(spotPricesTimestamp).toISOString()}</p>

                        <p>Holding value: {formatUsd(calculateHoldingValue(holding, spotPrice))}</p>
                      </>
                    ) : (
                      <p>Holding value: Unavailable</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No holdings yet. Add your first holding below.</p>
            )}
          </div>
        </div>
      )}

      {/* TODO: move to its own component */}
      <form aria-disabled={isCreatingHoldingLoading} className="flex flex-col gap-4 text-xl" onSubmit={onAddSubmit}>
        <div className="flex gap-2">
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
              if (value === 'gram' || value === 'ozt' || value === '') setWeightUnit(value);
            }}
            disabled={isCreatingHoldingLoading}
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
            disabled={isCreatingHoldingLoading}
          />
        </div>

        <div className="flex gap-2">
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
            disabled={isCreatingHoldingLoading}
          />
        </div>

        <div className="flex gap-2">
          <label htmlFor="holding-type">Holding type:</label>
          <select
            name="holding_type"
            id="holding-type"
            disabled={isCreatingHoldingLoading}
            value={holdingType}
            onChange={(e) => {
              setHoldingType(e.target.value);
            }}
          >
            <option value="">None selected</option>
          </select>
        </div>

        {/* TODO: show 'adding' when loading */}
        <button
          type="submit"
          className="border border-black box-border py-2 px-4 bg-gray-100 hover:cursor-pointer hover:bg-gray-200"
          disabled={isCreatingHoldingLoading}
        >
          Add
        </button>

        <p role="alert" aria-atomic="true">
          {creatingHoldingError}
        </p>
      </form>
    </main>
  );
}
