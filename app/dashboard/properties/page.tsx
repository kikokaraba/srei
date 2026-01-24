import { PropertyList } from "@/components/dashboard/PropertyList";

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Vyhľadávanie nehnuteľností
        </h1>
        <p className="text-slate-400">
          Pokročilé filtrovanie a vyhľadávanie slovenských nehnuteľností
        </p>
      </div>

      <PropertyList />
    </div>
  );
}
