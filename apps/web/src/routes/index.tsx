import { createFileRoute } from '@tanstack/react-router';
import type { SubmitEventHandler } from 'react';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const onAddSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    alert(JSON.stringify(Object.fromEntries(data)));
  };

  return (
    <main className="w-11/12 mx-auto mt-4 flex flex-col items-center gap-8">
      <h1 className="font-bold text-4xl">StackFolio 2</h1>

      <form className="flex flex-col gap-4 text-xl" onSubmit={onAddSubmit}>
        <input name="metal" className="border border-black box-border py-2 px-4 bg-gray-100" placeholder="metal" />
        <input name="weight" className="border border-black box-border py-2 px-4 bg-gray-100" placeholder="weight" />
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
