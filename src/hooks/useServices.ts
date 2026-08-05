import { useCallback } from 'react';
import { Service } from '../types';

export function useServices(
  _services: Service[],
  _setServices: React.Dispatch<React.SetStateAction<Service[]>>,
  addService: (service: Service) => Promise<void>,
  updateService: (service: Service) => Promise<void>,
  deleteService: (id: string) => Promise<void>,
  broadcastP2PChange: () => void
) {
  const handleAddService = useCallback(async (srvData: Omit<Service, 'id' | 'createdAt'>) => {
    const newSrv: Service = {
      id: `srv-${Date.now()}`,
      ...srvData,
      createdAt: new Date().toISOString(),
    };

    await addService(newSrv);
    broadcastP2PChange();
  }, [addService, broadcastP2PChange]);

  const handleUpdateService = useCallback(async (updatedService: Service) => {
    await updateService(updatedService);
    broadcastP2PChange();
  }, [updateService, broadcastP2PChange]);

  const handleDeleteService = useCallback(async (id: string) => {
    await deleteService(id);
    broadcastP2PChange();
  }, [deleteService, broadcastP2PChange]);

  return {
    handleAddService,
    handleUpdateService,
    handleDeleteService,
  };
}