import * as React from "react";
import { Admin, Resource, ListGuesser, EditGuesser, Create, SimpleForm, TextInput } from "react-admin";
import simpleRestProvider from "ra-data-simple-rest";

// Backend URL will work both locally and on EC2
const backendURL = `http://${window.location.hostname}:3001`;

const TicketCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="title" />
    </SimpleForm>
  </Create>
);

export default function App() {
  return (
    <Admin dataProvider={simpleRestProvider(backendURL)}>
      <Resource
        name="tickets"
        list={ListGuesser}
        edit={EditGuesser}
        create={TicketCreate}
      />
    </Admin>
  );
}