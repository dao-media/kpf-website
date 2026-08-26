import { gql } from "@apollo/client";
import PageFromFaust, { pageVariables } from "./PageFromFaust";
const { GET_BLOG_PAGE } = require("./pageQueries");

export default function BlogPageTemplate(props) {
  return <PageFromFaust {...props} />;
}

BlogPageTemplate.query = gql`
  ${GET_BLOG_PAGE}
`;

BlogPageTemplate.variables = pageVariables;
