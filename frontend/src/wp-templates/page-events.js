import { gql } from "@apollo/client";
import PageFromFaust, { pageVariables } from "./PageFromFaust";
const { GET_EVENTS_PAGE } = require("./pageQueries");

export default function EventsPageTemplate(props) {
  return <PageFromFaust {...props} />;
}

EventsPageTemplate.query = gql`
  ${GET_EVENTS_PAGE}
`;

EventsPageTemplate.variables = pageVariables;
