import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
} from 'lucide-react';
import { Service, FinancialEntry, OfficeSettings } from '../types';
import { formatCurrency } from '../lib/formatters';
import { makeT, validationMessage } from '../lib/i18n';
import { validateName, validateAmount } from '../lib/validation';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface ServicesManagerProps {
  services: Service[];
  entries: FinancialEntry[];
  settings: OfficeSettings;
  onAddService: (service: Omit<Service, 'id' | 'createdAt'>) => void;
  onUpdateService: (service: Service) => void;
  onDeleteService: (id: string) => void;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({
  services,
  entries,
  settings,
  onAddService,
  onUpdateService,
  onDeleteService,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState<string>('');
  const [defaultPrice, setDefaultPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const categories = [
    'الجوازات',
    'المرور',
    'الترجمة',
    'مكتب العمل',
    'البلدية',
    'العقود',
    'التجارة',
    'خدمات عامة',
  ];

  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';
  const { showError } = useToast();

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameResult = validateName(name);
    if (!nameResult.isValid) {
      showError(validationMessage(nameResult.code, t));
      return;
    }
    const priceResult = validateAmount(defaultPrice);
    if (!priceResult.isValid) {
      showError(validationMessage(priceResult.code, t));
      return;
    }
    const price = parseFloat(defaultPrice);

    onAddService({
      name: name.trim(),
      defaultPrice: price,
      category,
      isActive: true,
    });

    setName('');
    setDefaultPrice('');
    setCategory('');
    setShowAddModal(false);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    const nameResult = validateName(editingService.name);
    if (!nameResult.isValid) {
      showError(validationMessage(nameResult.code, t));
      return;
    }
    if (editingService.defaultPrice !== undefined && editingService.defaultPrice > 0) {
      const priceResult = validateAmount(editingService.defaultPrice);
      if (!priceResult.isValid) {
        showError(validationMessage(priceResult.code, t));
        return;
      }
    }

    onUpdateService(editingService);
    setEditingService(null);
  };

  // Filtered Services List
  const filteredServices = services.filter((srv) => {
    if (selectedCategoryFilter !== 'all' && srv.category !== selectedCategoryFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        srv.name.toLowerCase().includes(q) ||
        srv.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span>{t('srvPageTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {t('srvPageSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md shadow-blue-100 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addServiceBtn')}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchServicePlaceholder')}
            className="w-full bg-slate-50 border border-slate-200 rounded-full pr-10 pl-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('allDepartments', { count: String(services.length) })}
          </button>
          {categories.map((cat) => {
            const count = services.filter((s) => s.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  selectedCategoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-400 font-medium border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">{t('thServiceTransaction')}</th>
                <th className="px-5 py-3.5">{t('thDepartmentCategory')}</th>
                <th className="px-5 py-3.5">{t('defaultPriceShortLabel')}</th>
                <th className="px-5 py-3.5">{t('thTotalExecutions')}</th>
                <th className="px-5 py-3.5">{t('thTotalRevenueGenerated')}</th>
                <th className="px-5 py-3.5">{t('status')}</th>
                <th className="px-5 py-3.5 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredServices.map((srv) => {
                const srvEntries = entries.filter((e) => e.serviceId === srv.id);
                const srvRevenue = srvEntries.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <tr key={srv.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {srv.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-blue-50 text-blue-700 border border-blue-200/60 px-3 py-0.5 rounded-full text-xs font-bold">
                        {srv.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-black text-slate-900 dir-ltr text-right">
                      {formatCurrency(srv.defaultPrice, settings.currency, lang)}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">
                      {srvEntries.length} {t('timesUnit')}
                    </td>
                    <td className="px-5 py-3.5 font-black text-emerald-600 dir-ltr text-right">
                      {formatCurrency(srvRevenue, settings.currency, lang)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          srv.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {srv.isActive ? t('statusActiveService') : t('statusInactiveService')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingService(srv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingService({ id: srv.id, name: srv.name })}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!deletingService}
          title={t('confirmDeleteSrvTitle')}
          message={t('confirmDeleteSrvMessage', { name: deletingService?.name ?? '' })}
          language={lang}
          onConfirm={() => {
            if (deletingService) {
              onDeleteService(deletingService.id);
            }
          }}
          onClose={() => setDeletingService(null)}
        />
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">{t('addSrvTitle')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('serviceNameLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('serviceNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('thDepartmentCategory')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('defaultPriceCurrencyLabel', { currency: settings.currency })}</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold dir-ltr text-right"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
                >
                  {t('saveServiceBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">{t('editSrvTitle')}</h3>
              <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('serviceNameShortLabel')}</label>
                <input
                  type="text"
                  required
                  value={editingService.name}
                  onChange={(e) =>
                    setEditingService({ ...editingService, name: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('departmentLabel')}</label>
                <select
                  value={editingService.category}
                  onChange={(e) =>
                    setEditingService({ ...editingService, category: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('defaultPriceShortLabel')}</label>
                <input
                  type="number"
                  step="any"
                  value={editingService.defaultPrice}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      defaultPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('status')}</label>
                <select
                  value={editingService.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      isActive: e.target.value === 'active',
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="active">{t('statusActiveOption')}</option>
                  <option value="inactive">{t('statusInactiveOption')}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};