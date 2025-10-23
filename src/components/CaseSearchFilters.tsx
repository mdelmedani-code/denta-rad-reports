import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface SearchFilters {
  patientName: string;
  patientId: string;
  dateFrom: string;
  dateTo: string;
  urgency: string;
  fieldOfView: string;
}

interface CaseSearchFiltersProps {
  onFilterChange: (filters: SearchFilters) => void;
  onReset: () => void;
}

export default function CaseSearchFilters({ onFilterChange, onReset }: CaseSearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    patientName: '',
    patientId: '',
    dateFrom: '',
    dateTo: '',
    urgency: '',
    fieldOfView: '',
  });

  const handleChange = (field: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const emptyFilters: SearchFilters = {
      patientName: '',
      patientId: '',
      dateFrom: '',
      dateTo: '',
      urgency: '',
      fieldOfView: '',
    };
    setFilters(emptyFilters);
    onReset();
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-card border rounded-lg p-4 mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search & Filter Cases
        </h3>
        {hasActiveFilters && (
          <Button onClick={handleReset} variant="ghost" size="sm">
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientName">Patient Name</Label>
          <Input
            id="patientName"
            placeholder="Search by name..."
            value={filters.patientName}
            onChange={(e) => handleChange('patientName', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="patientId">Patient ID</Label>
          <Input
            id="patientId"
            placeholder="Search by ID..."
            value={filters.patientId}
            onChange={(e) => handleChange('patientId', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="urgency">Urgency</Label>
          <Select value={filters.urgency} onValueChange={(value) => handleChange('urgency', value)}>
            <SelectTrigger id="urgency">
              <SelectValue placeholder="All urgencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fieldOfView">Field of View</Label>
          <Select value={filters.fieldOfView} onValueChange={(value) => handleChange('fieldOfView', value)}>
            <SelectTrigger id="fieldOfView">
              <SelectValue placeholder="All FOVs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="up_to_5x5">Up to 5x5 cm</SelectItem>
              <SelectItem value="up_to_8x5">Up to 8x5 cm</SelectItem>
              <SelectItem value="up_to_8x8">Up to 8x8 cm</SelectItem>
              <SelectItem value="over_8x8">Over 8x8 cm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFrom">Date From</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Date To</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
