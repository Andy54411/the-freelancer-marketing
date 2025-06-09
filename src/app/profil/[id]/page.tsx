/* eslint-disable @typescript-eslint/no-explicit-any */
import ClientProfilePage from './components/ClientProfilePage';

export default function Page(props: any) {
  const id = props?.params?.id;
  return <ClientProfilePage id={id} />;
}
