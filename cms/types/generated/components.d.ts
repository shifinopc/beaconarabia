import type { Schema, Struct } from '@strapi/strapi';

export interface SectionCard extends Struct.ComponentSchema {
  collectionName: 'components_section_cards';
  info: {
    description: 'One card inside a Section \u2014 heading, copy, optional badge and image.';
    displayName: 'Card';
  };
  attributes: {
    badge: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'section.card': SectionCard;
    }
  }
}
