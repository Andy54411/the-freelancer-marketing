'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2 } from 'lucide-react';
import type { ServiceItem } from '@/types/service';

interface ServiceManageProps {
  services: ServiceItem[];
  isLoading: boolean;
  onEditService: (service: ServiceItem) => void;
  onDeleteService: (serviceId: string) => void;
  onToggleServiceActive: (serviceId: string) => void;
}

export const ServiceManage: React.FC<ServiceManageProps> = ({
  services,
  isLoading,
  onEditService,
  onDeleteService,
  onToggleServiceActive,
}) => {
  const handleDeleteClick = (service: ServiceItem) => {
    if (window.confirm(`Möchten Sie den Service "${service.title}" wirklich löschen?`)) {
      onDeleteService(service.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">Keine Services vorhanden</div>
            <p className="text-sm">
              Erstellen Sie Ihren ersten Service über den &quot;Erstellen&quot; Tab.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {services.map(service => (
        <Card
          key={service.id}
          className={`transition-all ${service.active ? 'border-[#14ad9f]' : 'border-gray-200 opacity-75'}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {service.title}
                </CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
                <Badge variant="secondary" className="text-xs">
                  {service.subcategory}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={service.active}
                    onCheckedChange={() => onToggleServiceActive(service.id)}
                    className="data-[state=checked]:bg-[#14ad9f]"
                  />
                  <span className="text-sm text-gray-600">
                    {service.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Active Packages */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Aktive Pakete</h4>
                <div className="flex flex-wrap gap-2">
                  {service.activePackages && service.activePackages.length > 0 ? (
                    service.activePackages.map(packageType => {
                      const packageInfo =
                        service.packages[packageType as keyof typeof service.packages];
                      return (
                        <div
                          key={packageType}
                          className="inline-flex items-center gap-2 bg-[#14ad9f]/10 text-[#14ad9f] px-3 py-1 rounded-full text-sm"
                        >
                          <span className="font-medium">
                            {packageType.charAt(0).toUpperCase() + packageType.slice(1)}
                          </span>
                          {packageInfo && (
                            <>
                              <span>•</span>
                              <span className="font-semibold">{packageInfo.price}€</span>
                              <span>•</span>
                              <span>{packageInfo.deliveryTime}d</span>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-sm text-gray-500">Keine aktiven Pakete</span>
                  )}
                </div>
              </div>

              {/* Add-ons */}
              {service.additionalServices && service.additionalServices.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Zusatzleistungen ({service.additionalServices.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {service.additionalServices.slice(0, 3).map((addon, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {addon.name} ({addon.price}€)
                      </Badge>
                    ))}
                    {service.additionalServices.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{service.additionalServices.length - 3} weitere
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Service Stats */}
              <div className="grid grid-cols-3 gap-4 text-center border-t pt-3">
                <div>
                  <div className="text-lg font-semibold text-[#14ad9f]">
                    {service.activePackages?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Pakete</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-[#14ad9f]">
                    {service.additionalServices?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Add-ons</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-[#14ad9f]">
                    {service.packages.basic?.price ||
                      service.packages.standard?.price ||
                      service.packages.premium?.price ||
                      0}
                    €
                  </div>
                  <div className="text-xs text-gray-500">ab</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 border-t pt-3">
                <Button
                  onClick={() => onEditService(service)}
                  size="sm"
                  variant="outline"
                  className="hover:border-[#14ad9f] hover:text-[#14ad9f]"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
                <Button
                  onClick={() => handleDeleteClick(service)}
                  size="sm"
                  variant="outline"
                  className="hover:border-red-500 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
