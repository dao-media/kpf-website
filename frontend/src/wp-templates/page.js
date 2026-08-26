import { gql } from "@apollo/client";
import PageFromFaust, { pageVariables } from "./PageFromFaust";
const { GET_PAGE } = require("./pageQueries");

/** Unknown pages: Mustache design HTML only. No grants/events/blog overfetch. */
export default function PageTemplate(props) {
  return <PageFromFaust {...props} />;
}

PageTemplate.query = gql`
  ${GET_PAGE}
`;

PageTemplate.variables = pageVariables;
