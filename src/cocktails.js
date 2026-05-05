import SOURCE_CSV from './data/cocktails.csv?raw';

const FALLBACK_CSV = `Name,Ingredients,Method
The Stump,2 oz Bourbon; Root Beer; Fresh lime zest,Pour bourbon over ice. Top with Root Beer. Express lime zest over surface and drop in.
Kentucky Mule,2 oz Bourbon; 4 oz Ginger Beer; ¾ oz lime juice; 2 dashes Aromatic Bitters,Pour bourbon and lime over ice. Top with ginger beer and bitters. Stir once.
The Hollow,2 oz Single Barrel Bourbon; 1 bar spoon Barrel-Aged Honey; 3 dashes Aromatic Bitters; 1 Cherry,Stir honey and bitters. Add ice and bourbon. Stir 20 rotations. Garnish with orange peel and cherry.
Cave Highball,2 oz Small Batch Bourbon; 4 oz Premium Tonic; 1 dash Orange Bitters,"Fill glass with ice. Add bourbon, then tonic, then bitters. Stir gently."
Bardstown Sour,2 oz Bottled in Bond Bourbon; ¾ oz lemon juice; ¾ oz honey syrup; 1 egg white; 2 dashes Aromatic Bitters,Dry shake all but bitters. Add ice and shake hard. Double strain. Dash bitters on foam.
Rye Manhattan,2 oz Rye Whiskey; 1 oz sweet vermouth; 3 dashes Aromatic Bitters; 1 Cherry,Stir ingredients with ice for 30 rotations. Strain into chilled coupe. Add cherry.
Wheated & Cola,2 oz Wheated Bourbon; Cola; Lime wedge,Pour bourbon over ice. Top with cola. Squeeze and drop lime.
The Reserve Sipper,2 oz Reserve Bourbon; 1 drop Still Water (optional),Pour neat. Add water drop if desired. Serve in rocks glass.
Smoky Paloma,2 oz Rye Whiskey; 1 oz grapefruit juice; ½ oz lime juice; Lemon soda; Smoked Salt rim,Rim glass with salt. Shake rye and juices. Strain into glass over ice. Top with lemon soda.
Rickhouse Julep,2½ oz Small Batch Bourbon; 1 bar spoon honey; 8 mint leaves; Crushed ice,Muddle mint and honey. Fill with crushed ice. Add bourbon. Stir until frosted. Garnish with mint.
Bourbon Ginger Smash,2 oz Original; 3 ginger slices; ¾ oz lemon juice; ½ oz simple syrup; Ginger Ale,"Muddle ginger. Add bourbon, lemon, and syrup. Shake hard. Double strain over ice. Top with ginger ale."
Rye Sazerac,2 oz Rye Whiskey; 1 sugar cube; 3 dashes Aromatic Bitters; Absinthe rinse; Lemon peel,"Rinse glass with absinthe. Muddle sugar, bitters, and water. Add rye and ice. Stir and strain neat. Express lemon peel and discard."
Wheated Cherry Sour,2 oz Wheated; 1 oz cherry juice; ¾ oz lemon juice; 1 egg white; 2 dashes Orange Bitters,Dry shake all but bitters. Add ice and shake hard. Double strain. Add bitters and cherry.
BiB Hot Toddy,2 oz Bottled in Bond Bourbon; 1 tbsp honey; ½ oz lemon juice; 4 oz hot water; Cinnamon stick,"Combine honey, lemon, and bourbon in mug. Top with hot water. Stir with cinnamon stick."
Blood Orange Boulevardier,1½ oz Single Barrel Bourbon; 1 oz Campari; 1 oz sweet vermouth; ½ oz Blood Orange,"Stir bourbon, Campari, and vermouth. Strain over large ice cube. Top with blood orange soda."
Perthshire Negroni,1 oz Cask Rested Gin; 1 oz Campari; 1 oz sweet vermouth; 1 dash Orange Bitters,Stir all ingredients with ice. Strain into rocks glass over large cube.
Highland & Tonic,2 oz Highland Gin; 4 oz Elderflower Tonic,Build in glass over ice. Do not stir.
Highland Gimlet,2 oz Highland Gin; ¾ oz lime juice; ½ oz simple syrup,Shake hard with ice. Double strain into chilled coupe.
Aromatic Highball,2 oz Highland Gin; 4 oz Aromatic Tonic; 1 dash Aromatic Bitters,Pour gin over ice. Top with tonic and bitters. Stir once.
Heather Collins,2 oz Highland Gin; 1 oz lemon juice; ½ oz simple syrup; Club Soda,"Shake gin, lemon, and syrup. Strain over ice. Top with club soda."
Cask Rested Old Fashioned,2 oz Cask Rested Gin; 1 bar spoon honey; 2 dashes Orange Bitters; 1 dash Aromatic Bitters,Stir honey and bitters. Add large cube and gin. Stir 20 rotations. Express orange peel.
Bitter Lemon & Gin,2 oz Highland Gin; 4 oz Bitter Lemon,Build in glass over ice. Stir once.
The Last Light,1½ oz Highland Gin; ¾ oz elderflower liqueur; ¾ oz lemon juice; Sparkling Water,"Shake gin, liqueur, and lemon. Strain into flute or coupe. Top with sparkling water."
Rosé Spritz,3 oz Estate Rosé; 2 oz Sparkling Water; 1 oz Blood Orange,Build over ice in wine glass. Stir gently.
Starlight Royale,5 oz Starlight & Steel Sparkling; 1 bar spoon honey; 2 dashes Orange Bitters,Add honey and bitters to flute. Top slowly with sparkling wine.
Still Small Spritz,3 oz Chardonnay; 2 oz Elderflower Tonic; cucumber; mint,"Build over ice. Add cucumber, top with tonic. Garnish with mint."
Radio Silence Sangria,1 bottle Red Blend; 2 oz honey; 4 oz Blood Orange; Seasonal fruit; Cinnamon,"Steep wine, honey, and fruit 4+ hours. Serve over ice topped with blood orange soda."
Tuscan Spritz,3 oz Chianti; 2 oz Ginger Ale; Rosemary sprig,Build over ice in wine glass. Top with ginger ale. Add slapped rosemary.
Sparkling Lemon Drop,3 oz Starlight & Steel Sparkling; ½ oz lemon juice; ¼ oz simple syrup; 1 oz Lemon,Shake lemon and syrup. Strain into flute. Top with sparkling wine and lemon soda.
Rosé Paloma,3 oz Estate Rosé; 1 oz grapefruit juice; 1 oz Club Soda; Smoked Salt rim,Rim glass with salt. Build over ice. Top with club soda.
Chardonnay Ginger Fizz,3 oz Chardonnay; 2 oz Ginger Beer; Lemon zest,Build over ice. Top with ginger beer. Add lemon zest.
Wake Up Call,6 oz Cola; 1 cooled espresso shot; Lemon zest,Pour espresso over ice. Top slowly with cola. Express lemon zest.
Cherry Float,8 oz Cream Soda; 1 scoop vanilla gelato; 1 squeezed cherry,Place gelato in glass. Squeeze cherry over top. Top slowly with cream soda.
Golden Child,5 oz Ginger Beer; 2 oz blood orange juice; Lemon zest,Pour juice over ice. Top with ginger beer. Express lemon zest.
Limestone Spritz,4 oz Blood Orange; 2 oz Aromatic Tonic; Rosemary,Build over ice. Add slapped rosemary.
The Stillwater,6 oz Elderflower Tonic; ½ oz Tonic Syrup; Cucumber; Mint,Muddle cucumber and mint. Add ice and syrup. Top with tonic.
Porch Swing,6 oz Lemon; 1 bar spoon honey; 4 mint leaves; ½ oz lemon juice,Dissolve honey in lemon juice. Add ice and mint. Top with lemon soda.
Root Beer Float,8 oz Root Beer; 2 scoops vanilla ice cream,Place ice cream in glass. Top slowly with root beer.
Bitter Sunset,5 oz Bitter Lemon; 1 oz grapefruit juice; ¼ oz Tonic Syrup; Smoked Salt rim,Rim glass with salt. Combine juice and syrup. Top with bitter lemon.
Ginger Highball,6 oz Ginger Ale; ½ oz lime juice; Mint; 1 dash Bitters,Build over ice. Add lime and ginger ale. Float bitters and add mint.
Sparkling Honey Lemon,6 oz Sparkling Water; 1 tsp honey; ½ oz lemon juice; pinch Smoked Salt,Dissolve honey in lemon juice and salt. Add ice. Top with sparkling water.
Cola Lime Cooler,4 oz Cola; 2 oz Club Soda; 1 oz lime juice,Add lime and cola to ice. Top with club soda.
Cream & Orange,4 oz Cream Soda; 4 oz Blood Orange,Build over crushed ice. Layer cream soda over blood orange using a spoon.
The Architect,2 oz Vodka; 1 oz blackberry puree; ¾ oz lemon juice; 2 oz Ginger Beer,"Shake vodka, puree, and lemon. Strain over crushed ice. Top with ginger beer."
Botanical Garden,2 oz Gin; ¾ oz grapefruit juice; ½ oz simple syrup; 3 basil leaves; Splash of Tonic,"Muddle basil. Add gin, grapefruit, and syrup. Shake hard. Strain over fresh ice. Top with tonic."
The Journeyman,2 oz Aged Rum; ½ oz cold brew coffee; ¼ oz maple syrup; 2 dashes Orange Bitters,Stir all ingredients with ice for 20 rotations. Serve over a large cube with an orange peel.
Bluegrass Botanical,2 oz Vodka; ¾ oz elderflower liqueur; ½ oz lime juice; cucumber slice; black pepper,"Muddle cucumber. Shake with vodka, liqueur, and lime. Strain into a coupe. Garnish with cracked black pepper."
Appalachian Smoke,2 oz Blanco Tequila; ½ oz Mezcal; ¾ oz lime juice; ½ oz smoked honey syrup,"Shake all ingredients with ice. Strain into a rocks glass over fresh ice. Garnish with a lime wheel."
The Plumb Line,2 oz Bourbon; 1 tbsp plum jam; ¾ oz lemon juice; 2 dashes Aromatic Bitters,"Shake bourbon, jam, lemon, and bitters vigorously. Double strain into a chilled coupe."
Sunset Over Frankfort,1 oz Bourbon; 1 oz Aperol; ¾ oz lemon juice; 2 oz grapefruit soda,"Shake bourbon, Aperol, and lemon. Strain into a Collins glass over ice. Top with grapefruit soda."
Spiced Pear Smash,2 oz Vodka; 1 oz pear nectar; ½ oz lemon juice; pinch of cinnamon,"Shake all ingredients with ice. Strain into a rocks glass. Garnish with a cinnamon stick."
The Bee's Knees,2 oz Gin; ¾ oz Lemon Juice; ½ oz Honey Syrup,"Shake all ingredients with ice and strain into a chilled glass."
Dark and Stormy,2 oz Dark Rum; 3 oz Ginger Beer; ½ oz Lime Juice,"Build in an ice-filled glass. Top with ginger beer and garnish with a lime wedge."
Espresso Martini,2 oz Vodka; 1 oz Espresso; ½ oz Coffee Liqueur; ¼ oz Simple Syrup,"Shake vigorously with ice to create a foam. Strain into a chilled martini glass."
French 75,1 oz Gin; ½ oz Lemon Juice; ½ oz Simple Syrup; 3 oz Champagne,"Shake gin, lemon, and syrup with ice. Strain into a flute and top with Champagne."
Aperol Spritz,3 oz Prosecco; 2 oz Aperol; 1 oz Club Soda,"Build over ice in a wine glass. Garnish with an orange slice."
Classic Margarita,2 oz Blanco Tequila; 1 oz Fresh Lime Juice; ½ oz Agave Nectar,"Shake all ingredients with ice. Strain over fresh ice in a salt-rimmed rocks glass."
Cuban Mojito,2 oz White Rum; 1 oz Lime Juice; ¾ oz Simple Syrup; 8-10 Mint Leaves; Club Soda,"Lightly muddle mint with syrup. Add rum, lime, and ice. Top with club soda and gently stir."
Whiskey Smash,2 oz Bourbon; ¾ oz Simple Syrup; ½ Lemon (cut into wedges); 6 Mint Leaves,"Muddle lemon and mint with syrup. Add bourbon and ice. Shake hard and double strain over fresh crushed ice."
Paper Plane,¾ oz Bourbon; ¾ oz Aperol; ¾ oz Amaro Nonino; ¾ oz Lemon Juice,"Shake all ingredients with ice and strain into a chilled coupe."
Corpse Reviver No. 2,¾ oz Gin; ¾ oz Lillet Blanc; ¾ oz Orange Liqueur; ¾ oz Lemon Juice; 1 dash Absinthe,"Shake all ingredients with ice and strain into a chilled coupe or martini glass."
Penicillin,2 oz Blended Scotch; ¾ oz Lemon Juice; ¾ oz Honey-Ginger Syrup; ¼ oz Islay Scotch,"Shake blended scotch, lemon, and syrup with ice. Strain over a large ice cube. Float Islay scotch on top."
The Bramble,2 oz Gin; 1 oz Lemon Juice; ½ oz Simple Syrup; ½ oz Blackberry Liqueur,"Shake gin, lemon, and syrup with ice. Strain over crushed ice. Drizzle blackberry liqueur over the top."`;

export const RAW_CSV = SOURCE_CSV || FALLBACK_CSV;

export function parseCSV(csv) {
  const lines = [];
  let currentLine = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentLine.push(currentCell.trim());
      lines.push(currentLine);
      currentLine = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentLine.length) {
    currentLine.push(currentCell.trim());
    lines.push(currentLine);
  }

  const [headers = [], ...rows] = lines;
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const getCell = (row, name, fallbackIndex) => {
    const index = normalizedHeaders.indexOf(name.toLowerCase());
    return row[index >= 0 ? index : fallbackIndex] || '';
  };

  return rows
    .map((row, index) =>
      enrichCocktail({
        id: `base-${index}-${slugify(getCell(row, 'Name', 0) || 'cocktail')}`,
        Name: getCell(row, 'Name', 0),
        Ingredients: getCell(row, 'Ingredients', 1),
        Method: getCell(row, 'Method', 2),
        Glass: getCell(row, 'Glass', 3),
        FlavorProfile: getCell(row, 'FlavorProfile', 4) || getCell(row, 'Flavor Profile', 4),
        source: 'folio',
      }),
    )
    .filter((cocktail) => cocktail.Name);
}

export function enrichCocktail(cocktail) {
  const enriched = {
    ...cocktail,
    Glass: cocktail.Glass || inferGlassType(cocktail),
    FlavorProfile: cocktail.FlavorProfile || inferFlavorProfile(cocktail),
  };

  return enriched;
}

export function inferGlassType(cocktail) {
  const text = searchableText(cocktail);

  if (matchesAny(text, ['hot water', 'toddy', 'mug'])) return 'Mug';
  if (matchesAny(text, ['julep'])) return 'Julep cup';
  if (matchesAny(text, ['flute', 'champagne', 'sparkling wine', 'french 75', 'royale'])) return 'Flute';
  if (matchesAny(text, ['wine glass', 'sangria', 'spritz', 'rosé', 'chardonnay', 'chianti', 'red blend', 'prosecco'])) {
    return 'Wine glass';
  }
  if (matchesAny(text, ['coupe', 'martini', 'gimlet', 'manhattan', 'paper plane', 'corpse reviver', "bee's knees"])) {
    return 'Coupe';
  }
  if (matchesAny(text, ['collins'])) return 'Collins glass';
  if (matchesAny(text, ['mule', 'highball', 'ginger beer', 'ginger ale', 'tonic', 'club soda', 'cola', 'root beer', 'cream soda', 'lemon soda'])) {
    return 'Highball';
  }
  if (matchesAny(text, ['margarita', 'paloma', 'smash', 'old fashioned', 'sazerac', 'negroni', 'boulevardier', 'large cube', 'rocks glass'])) {
    return 'Rocks glass';
  }

  return 'Rocks glass';
}

export function inferFlavorProfile(cocktail) {
  const text = searchableText(cocktail);

  if (matchesAny(text, ['espresso', 'coffee', 'cold brew'])) return 'Coffee rich';
  if (matchesAny(text, ['cream soda', 'ice cream', 'gelato', 'float'])) return 'Creamy dessert';
  if (matchesAny(text, ['campari', 'aperol', 'amaro', 'vermouth', 'bitter'])) return 'Bittersweet';
  if (matchesAny(text, ['mezcal', 'smoked', 'scotch', 'smoky'])) return 'Smoky';
  if (matchesAny(text, ['ginger beer', 'ginger ale', 'ginger', 'cinnamon', 'black pepper'])) return 'Spiced ginger';
  if (matchesAny(text, ['tonic', 'elderflower', 'cucumber', 'mint', 'basil', 'rosemary', 'botanical'])) return 'Botanical fresh';
  if (matchesAny(text, ['grapefruit', 'blood orange', 'cherry', 'blackberry', 'plum', 'pear', 'seasonal fruit'])) return 'Fruity bright';
  if (matchesAny(text, ['lemon', 'lime', 'sour', 'citrus'])) return 'Citrus sour';
  if (matchesAny(text, ['honey', 'maple', 'agave', 'simple syrup'])) return 'Sweet tart';
  if (matchesAny(text, ['cola', 'root beer'])) return 'Soda sweet';
  if (matchesAny(text, ['sparkling', 'prosecco', 'champagne', 'rosé', 'chardonnay', 'wine'])) return 'Sparkling fruit';

  return 'Balanced';
}

function searchableText(cocktail) {
  return `${cocktail.Name || ''} ${cocktail.Ingredients || ''} ${cocktail.Method || ''}`.toLowerCase();
}

function matchesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
