import React from 'react';

interface ServicePageProps {
  params: {
    service: string;
  };
}

const ServicePage: React.FC<ServicePageProps> = ({ params }) => {
  const serviceName = decodeURIComponent(params.service);

  return (
    <div>
      <h1>Service: {serviceName}</h1>
      <p>Details for the service "{serviceName}" will be displayed here.</p>
    </div>
  );
};

export default ServicePage;
