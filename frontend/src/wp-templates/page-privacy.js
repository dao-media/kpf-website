import { gql } from "@apollo/client";
import PageFromFaust, { pageVariables } from "./PageFromFaust";
const { GET_PRIVACY_PAGE } = require("./pageQueries");

export default function PrivacyPageTemplate(props) {
  return <PageFromFaust {...props} />;
}

PrivacyPageTemplate.query = gql`
  ${GET_PRIVACY_PAGE}
`;

PrivacyPageTemplate.variables = pageVariables;
