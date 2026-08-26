import { gql } from "@apollo/client";
import PageFromFaust, { pageVariables } from "./PageFromFaust";
const { GET_CONTACT_PAGE } = require("./pageQueries");

export default function ContactPageTemplate(props) {
  return <PageFromFaust {...props} />;
}

ContactPageTemplate.query = gql`
  ${GET_CONTACT_PAGE}
`;

ContactPageTemplate.variables = pageVariables;
