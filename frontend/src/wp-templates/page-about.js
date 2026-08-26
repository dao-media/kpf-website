import { gql } from "@apollo/client";
import PageFromFaust, { pageVariables } from "./PageFromFaust";
const { GET_ABOUT_PAGE } = require("./pageQueries");

export default function AboutPageTemplate(props) {
  return <PageFromFaust {...props} />;
}

AboutPageTemplate.query = gql`
  ${GET_ABOUT_PAGE}
`;

AboutPageTemplate.variables = pageVariables;
