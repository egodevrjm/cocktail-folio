import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Cloud,
  Copy,
  GlassWater,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  List,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Wand2,
  X,
} from 'lucide-react';
import { RAW_CSV, enrichCocktail, parseCSV } from './cocktails.js';
import {
  generateCocktail,
  generateCocktailImage,
  getAIProviderLabel,
} from './services/ai.js';
import { createFirebaseClient } from './services/firebaseCocktails.js';
import { getCocktailImage, saveCocktailImage } from './services/imageStore.js';
import { readLocalValue, writeLocalValue } from './services/localStore.js';

const FILTERS = ['All', 'Bourbon', 'Rye', 'Gin', 'Vodka', 'Tequila', 'Rum', 'Wine', 'Mocktail'];
const SORT_OPTIONS = [
  { value: 'folio', label: 'Folio order' },
  { value: 'name', label: 'Name' },
  { value: 'base', label: 'Alcohol type' },
  { value: 'glass', label: 'Glass type' },
  { value: 'flavor', label: 'Flavor profile' },
  { value: 'newest', label: 'Newest custom' },
];
const BASE_SORT_ORDER = ['bourbon', 'rye', 'gin', 'vodka', 'tequila', 'rum', 'wine', 'mocktail', 'generic'];
const BUILDER_BASES = ['Bourbon', 'Rye Whiskey', 'Gin', 'Vodka', 'Blanco Tequila', 'Dark Rum', 'Estate Rosé', 'No alcohol'];
const BUILDER_PROFILES = ['Citrus sour', 'Smoky', 'Bittersweet', 'Botanical fresh', 'Fruity bright', 'Spiced ginger', 'Coffee rich', 'Creamy dessert'];
const BUILDER_INGREDIENTS = [
  'Lemon juice',
  'Lime juice',
  'Grapefruit',
  'Blood orange',
  'Ginger beer',
  'Tonic',
  'Club soda',
  'Coffee',
  'Cherry',
  'Blackberry',
  'Pear',
  'Cucumber',
  'Mint',
  'Basil',
  'Rosemary',
  'Honey',
  'Agave',
  'Maple',
  'Bitters',
  'Smoked salt',
];
const LOCAL_RECIPE_KEY = 'cocktail_folio_recipes';
const LOCAL_FAVORITES_KEY = 'cocktail_favorites';
const LOCAL_RECIPE_EDITS_KEY = 'cocktail_folio_recipe_edits';
const PLACEHOLDER_IMAGES = {
  bourbon: '/images/placeholders/bourbon.png',
  gin: '/images/placeholders/gin.png',
  generic: '/images/placeholders/generic.png',
  mocktail: '/images/placeholders/mocktail.png',
  rum: '/images/placeholders/rum.png',
  rye: '/images/placeholders/rye.png',
  tequila: '/images/placeholders/tequila.png',
  vodka: '/images/placeholders/vodka.png',
  wine: '/images/placeholders/wine.png',
};

export default function App() {
  const [baseCocktails] = useState(() => parseCSV(RAW_CSV));
  const [userCocktails, setUserCocktails] = useState(() => readLocalValue(LOCAL_RECIPE_KEY, []));
  const [recipeEdits, setRecipeEdits] = useState(() => readLocalValue(LOCAL_RECIPE_EDITS_KEY, {}));
  const [favorites, setFavorites] = useState(() => readLocalValue(LOCAL_FAVORITES_KEY, []));
  const [user, setUser] = useState(null);
  const [cloudClient, setCloudClient] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('local');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('folio');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingCocktail, setEditingCocktail] = useState(null);
  const [selectedCocktail, setSelectedCocktail] = useState(null);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [cocktailImage, setCocktailImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageStatus, setImageStatus] = useState('');
  const [imageError, setImageError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [newName, setNewName] = useState('');
  const [newIngredients, setNewIngredients] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [newGlass, setNewGlass] = useState('');
  const [newFlavorProfile, setNewFlavorProfile] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [builderBase, setBuilderBase] = useState('Bourbon');
  const [builderProfile, setBuilderProfile] = useState('Citrus sour');
  const [builderIngredients, setBuilderIngredients] = useState(['Lemon juice', 'Honey']);
  const [builderNotes, setBuilderNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const imageAbortRef = useRef(null);

  useEffect(() => {
    let unsubscribeAuth;

    async function bootCloud() {
      const client = await createFirebaseClient();
      if (!client) return;

      setCloudClient(client);
      setCloudStatus('connecting');
      try {
        await client.signInAnonymously(client.auth);
        unsubscribeAuth = client.onAuthStateChanged(client.auth, (currentUser) => {
          setUser(currentUser);
          setCloudStatus(currentUser ? 'cloud' : 'local');
        });
      } catch (error) {
        console.warn('Cloud sign-in failed. Local mode remains available.', error);
        setCloudStatus('local');
      }
    }

    bootCloud();
    return () => unsubscribeAuth?.();
  }, []);

  useEffect(() => {
    if (!cloudClient || !user) return undefined;

    const collectionRef = cloudClient.collection(
      cloudClient.db,
      'artifacts',
      cloudClient.appId,
      'users',
      user.uid,
      'cocktails',
    );

    return cloudClient.onSnapshot(
      collectionRef,
      (snapshot) => {
        const recipes = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data(), source: 'cloud' }))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        setUserCocktails(recipes);
      },
      (error) => {
        console.warn('Cloud recipe listener failed. Keeping local recipes.', error);
        setCloudStatus('local');
      },
    );
  }, [cloudClient, user]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  useEffect(() => {
    if (cloudStatus !== 'cloud') writeLocalValue(LOCAL_RECIPE_KEY, userCocktails);
  }, [cloudStatus, userCocktails]);

  useEffect(() => {
    writeLocalValue(LOCAL_FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeLocalValue(LOCAL_RECIPE_EDITS_KEY, recipeEdits);
  }, [recipeEdits]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrCreateImage() {
      if (!selectedCocktail) {
        setCocktailImage(null);
        setImageStatus('');
        setImageError('');
        return;
      }

      setCocktailImage(null);
      setImageStatus('');
      setImageError('');
      setIsGeneratingImage(false);

      try {
        const savedImage = await getCocktailImage(selectedCocktail.id);
        if (cancelled) return;

        if (savedImage) {
          setCocktailImage(savedImage);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn(error);
          setImageError('Could not load or create the image.');
        }
      }
    }

    loadOrCreateImage();
    return () => {
      cancelled = true;
    };
  }, [selectedCocktail?.id]);

  const allCocktails = useMemo(
    () =>
      [...userCocktails, ...baseCocktails].map((cocktail, index) => {
        const edit = recipeEdits[cocktail.id];
        return {
          ...enrichCocktail({ ...cocktail, ...edit }),
          id: cocktail.id,
          source: cocktail.source,
          createdAt: cocktail.createdAt,
          sortIndex: index,
          isEdited: Boolean(edit),
        };
      }),
    [baseCocktails, recipeEdits, userCocktails],
  );

  const filteredCocktails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matchedCocktails = allCocktails.filter((cocktail) => {
      const ingredients = cocktail.Ingredients.toLowerCase();
      const matchesSearch =
        !query || cocktail.Name.toLowerCase().includes(query) || ingredients.includes(query);
      const matchesFilter = filterMatches(activeFilter, ingredients);

      return matchesSearch && matchesFilter;
    });

    return sortCocktails(matchedCocktails, sortBy);
  }, [activeFilter, allCocktails, searchQuery, sortBy]);

  const favoriteCount = allCocktails.filter((cocktail) => favorites.includes(cocktail.id)).length;
  const activeSortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label || 'Folio order';

  async function handleSaveCocktail(event) {
    event.preventDefault();
    if (!newName.trim() || !newIngredients.trim() || !newMethod.trim()) return;

    setIsSaving(true);
    const recipe = enrichCocktail({
      Name: newName.trim(),
      Ingredients: normalizeIngredients(newIngredients),
      Method: newMethod.trim(),
      Glass: newGlass.trim(),
      FlavorProfile: newFlavorProfile.trim(),
      createdAt: new Date().toISOString(),
    });

    if (editingCocktail) {
      saveEditedRecipe(editingCocktail, recipe);
      setIsSaving(false);
      resetForm();
      return;
    }

    if (cloudClient && user && cloudStatus === 'cloud') {
      try {
        const collectionRef = cloudClient.collection(
          cloudClient.db,
          'artifacts',
          cloudClient.appId,
          'users',
          user.uid,
          'cocktails',
        );
        await cloudClient.addDoc(collectionRef, recipe);
        showToast('Recipe saved to cloud');
      } catch (error) {
        console.warn('Cloud save failed. Saving locally instead.', error);
        saveLocalRecipe(recipe);
      }
    } else {
      saveLocalRecipe(recipe);
    }

    setIsSaving(false);
    resetForm();
  }

  function saveEditedRecipe(cocktail, recipe) {
    const editedRecipe = {
      Name: recipe.Name,
      Ingredients: recipe.Ingredients,
      Method: recipe.Method,
      Glass: recipe.Glass,
      FlavorProfile: recipe.FlavorProfile,
      editedAt: new Date().toISOString(),
    };

    const originalRecipe = enrichCocktail([...userCocktails, ...baseCocktails].find((item) => item.id === cocktail.id) || cocktail);
    const matchesOriginal =
      originalRecipe.Name === editedRecipe.Name &&
      originalRecipe.Ingredients === editedRecipe.Ingredients &&
      originalRecipe.Method === editedRecipe.Method &&
      originalRecipe.Glass === editedRecipe.Glass &&
      originalRecipe.FlavorProfile === editedRecipe.FlavorProfile;

    setRecipeEdits((current) => {
      if (!matchesOriginal) {
        return {
          ...current,
          [cocktail.id]: editedRecipe,
        };
      }

      const next = { ...current };
      delete next[cocktail.id];
      return next;
    });

    setSelectedCocktail((current) =>
      current?.id === cocktail.id
        ? { ...current, ...(matchesOriginal ? originalRecipe : editedRecipe), isEdited: !matchesOriginal }
        : current,
    );
    showToast(matchesOriginal ? 'Recipe restored' : 'Recipe updated');
  }

  function saveLocalRecipe(recipe) {
    const localRecipe = {
      ...recipe,
      id: crypto.randomUUID?.() || `${Date.now()}`,
      source: 'local',
    };
    setUserCocktails((current) => [localRecipe, ...current]);
    showToast('Recipe saved locally');
  }

  async function handleGenerateRecipe() {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError('');

    try {
      const recipe = await generateCocktail(aiPrompt.trim());
      setNewName(recipe.name);
      setNewIngredients(recipe.ingredients.split(';').map((ingredient) => ingredient.trim()).join(';\n'));
      setNewMethod(recipe.method);
      const enrichedRecipe = enrichCocktail({
        Name: recipe.name,
        Ingredients: recipe.ingredients,
        Method: recipe.method,
        Glass: recipe.glass,
        FlavorProfile: recipe.flavorProfile,
      });
      setNewGlass(enrichedRecipe.Glass);
      setNewFlavorProfile(enrichedRecipe.FlavorProfile);
      setAiPrompt('');
      showToast(`${getAIProviderLabel()} recipe generated`);
    } catch (error) {
      console.warn(error);
      setAiError('Could not generate a recipe right now. Try a shorter prompt.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateBuilderRecipe() {
    if (!builderBase || builderIngredients.length === 0) return;
    setIsGenerating(true);
    setAiError('');

    const noAlcohol = builderBase === 'No alcohol';
    const prompt = [
      noAlcohol
        ? 'Create a zero-proof cocktail with no alcohol, no spirits, no liqueurs, and no wine.'
        : `Create a cocktail built around ${builderBase}.`,
      `Flavor profile: ${builderProfile}.`,
      `Use or harmonize these ingredients: ${builderIngredients.join(', ')}.`,
      builderNotes.trim() ? `House notes: ${builderNotes.trim()}.` : '',
      'Return a balanced original recipe with a creative name, precise measurements, appropriate glassware, flavor details, garnish cues, and concise bartender method.',
      'Ingredients must be semicolon-separated.',
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const recipe = await generateCocktail(prompt);
      setNewName(recipe.name);
      setNewIngredients(recipe.ingredients.split(';').map((ingredient) => ingredient.trim()).join(';\n'));
      setNewMethod(recipe.method);
      const enrichedRecipe = enrichCocktail({
        Name: recipe.name,
        Ingredients: recipe.ingredients,
        Method: recipe.method,
        Glass: recipe.glass,
        FlavorProfile: recipe.flavorProfile || builderProfile,
      });
      setNewGlass(enrichedRecipe.Glass);
      setNewFlavorProfile(enrichedRecipe.FlavorProfile);
      showToast(`${getAIProviderLabel()} builder recipe generated`);
    } catch (error) {
      console.warn(error);
      setAiError('Could not build that recipe right now. Try fewer ingredients or a simpler profile.');
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleBuilderIngredient(ingredient) {
    setBuilderIngredients((current) =>
      current.includes(ingredient) ? current.filter((item) => item !== ingredient) : [...current, ingredient],
    );
  }

  async function handleGenerateCocktailImage(cocktail, options = {}) {
    const { isCancelled = () => false, silent = false } = options;
    imageAbortRef.current?.abort();
    const controller = new AbortController();
    imageAbortRef.current = controller;

    setIsGeneratingImage(true);
    setImageStatus('Calling Nano Banana');
    setImageError('');

    try {
      const generatedImage = await generateCocktailImage(cocktail, { signal: controller.signal });
      if (isCancelled()) return;

      setImageStatus('Saving image locally');
      const imageRecord = await saveCocktailImage({
        cocktailId: cocktail.id,
        cocktailName: cocktail.Name,
        createdAt: new Date().toISOString(),
        ...generatedImage,
      });

      if (isCancelled()) return;
      setCocktailImage(imageRecord);
      setImageStatus('Image ready');
      if (!silent) showToast('Image generated and saved');
    } catch (error) {
      if (isCancelled()) return;

      if (error?.name !== 'AbortError') console.warn(error);
      setImageStatus('');
      setImageError(getImageGenerationErrorMessage(error));
      if (!silent) showToast('Image generation failed');
    } finally {
      if (imageAbortRef.current === controller) imageAbortRef.current = null;
      if (!isCancelled()) setIsGeneratingImage(false);
    }
  }

  function handleCancelImageGeneration() {
    imageAbortRef.current?.abort();
    imageAbortRef.current = null;
    setIsGeneratingImage(false);
    setImageStatus('');
    setImageError('Image generation cancelled.');
  }

  function toggleFavorite(event, id) {
    event.stopPropagation();
    setFavorites((current) => (current.includes(id) ? current.filter((favorite) => favorite !== id) : [...current, id]));
  }

  async function handleCopy(cocktail) {
    const text = `${cocktail.Name}\nGlass: ${cocktail.Glass || 'Unknown'}\nFlavor: ${
      cocktail.FlavorProfile || 'Balanced'
    }\n\nIngredients:\n${cocktail.Ingredients.split(';')
      .map((ingredient) => `- ${ingredient.trim()}`)
      .join('\n')}\n\nMethod:\n${cocktail.Method}`;

    try {
      await copyText(text);
      setCopiedId(cocktail.id);
      showToast('Recipe copied');
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      showToast('Copy failed');
    }
  }

  function openMixingMode(cocktail) {
    setSelectedCocktail(cocktail);
    setCheckedIngredients([]);
  }

  function openEditCocktail(event, cocktail) {
    event?.stopPropagation();
    imageAbortRef.current?.abort();
    imageAbortRef.current = null;
    setIsGeneratingImage(false);
    setSelectedCocktail(null);
    setEditingCocktail(cocktail);
    setNewName(cocktail.Name || '');
    setNewIngredients(splitIngredients(cocktail.Ingredients || '').join(';\n'));
    setNewMethod(cocktail.Method || '');
    setNewGlass(cocktail.Glass || '');
    setNewFlavorProfile(cocktail.FlavorProfile || '');
    setAiPrompt('');
    setAiError('');
    setIsCreatorOpen(true);
  }

  function closeMixingMode() {
    imageAbortRef.current?.abort();
    imageAbortRef.current = null;
    setIsGeneratingImage(false);
    setSelectedCocktail(null);
  }

  function resetForm() {
    setNewName('');
    setNewIngredients('');
    setNewMethod('');
    setNewGlass('');
    setNewFlavorProfile('');
    setEditingCocktail(null);
    setAiPrompt('');
    setAiError('');
    setIsCreatorOpen(false);
  }

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="app-shell">
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
        </div>
      )}

      <header className="topbar">
        <div className="topbar__inner">
          <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="brand__mark">
              <GlassWater size={25} />
            </span>
            <span>The Cocktail Folio</span>
          </button>

          <div className="topbar__actions">
            <span className={`sync-pill sync-pill--${cloudStatus}`}>
              <Cloud size={15} />
              {cloudStatus === 'cloud' ? 'Cloud Sync' : cloudStatus === 'connecting' ? 'Connecting' : 'Local Library'}
            </span>
            <button className="icon-button" onClick={() => setIsDarkMode((current) => !current)} aria-label="Toggle theme">
              {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setEditingCocktail(null);
                setIsCreatorOpen(true);
              }}
            >
              <Plus size={19} />
              <span>Create</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="intro">
          <div>
            <h1>A working bar book for recipes you actually make.</h1>
            <p>
              Search the folio, save your own builds, favorite house classics, and open a checklist when it is time to mix.
            </p>
          </div>
          <div className="stats-strip" aria-label="Library summary">
            <span>
              <strong>{allCocktails.length}</strong>
              recipes
            </span>
            <span>
              <strong>{favoriteCount}</strong>
              favorites
            </span>
            <span>
              <strong>{userCocktails.length}</strong>
              custom
            </span>
          </div>
        </section>

        <section className="control-panel" aria-label="Recipe search and filters">
          <div className="search-tools">
            <label className="search-box">
              <Search size={20} />
              <input
                type="search"
                placeholder="Search by cocktail name or ingredient"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <div className="filter-menu">
              <button
                className={isFilterOpen ? 'filter-button filter-button--open' : 'filter-button'}
                onClick={() => {
                  setIsFilterOpen((current) => !current);
                  setIsSortOpen(false);
                }}
                aria-haspopup="menu"
                aria-expanded={isFilterOpen}
              >
                <BaseFilterIcon filter={activeFilter} />
                <span>Filter {activeFilter}</span>
                <ChevronDown size={16} />
              </button>
              {isFilterOpen && (
                <div className="filter-popover" role="menu">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter}
                      className={activeFilter === filter ? 'filter-option filter-option--active' : 'filter-option'}
                      onClick={() => {
                        setActiveFilter(filter);
                        setIsFilterOpen(false);
                      }}
                      role="menuitem"
                    >
                      <span>
                        <BaseFilterIcon filter={filter} />
                        {filter}
                      </span>
                      {activeFilter === filter && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="filter-toolbar">
            <div className="view-tools">
              <div className="sort-menu">
                <button
                  className={isSortOpen ? 'sort-button sort-button--open' : 'sort-button'}
                  onClick={() => {
                    setIsSortOpen((current) => !current);
                    setIsFilterOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isSortOpen}
                >
                  <ArrowUpDown size={16} />
                  <span>Sort by {activeSortLabel}</span>
                  <ChevronDown size={16} />
                </button>
                {isSortOpen && (
                  <div className="sort-popover" role="menu">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={sortBy === option.value ? 'sort-option sort-option--active' : 'sort-option'}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortOpen(false);
                        }}
                        role="menuitem"
                      >
                        {option.label}
                        {sortBy === option.value && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="view-toggle" aria-label="Show recipes as">
                <button
                  className={viewMode === 'grid' ? 'view-toggle__button view-toggle__button--active' : 'view-toggle__button'}
                  onClick={() => setViewMode('grid')}
                  aria-label="Show as grid"
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  className={viewMode === 'list' ? 'view-toggle__button view-toggle__button--active' : 'view-toggle__button'}
                  onClick={() => setViewMode('list')}
                  aria-label="Show as list"
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="result-meta">
          <BookOpen size={19} />
          <span>Showing {filteredCocktails.length} recipes</span>
        </div>

        <section className={`recipe-grid recipe-grid--${viewMode}`} aria-label="Cocktail recipes">
          {filteredCocktails.map((cocktail) => (
            <article className="recipe-card" key={cocktail.id} onClick={() => openMixingMode(cocktail)}>
              {(cocktail.createdAt || cocktail.source === 'cloud' || cocktail.source === 'local' || cocktail.isEdited) && (
                <span className="recipe-card__badge">{cocktail.isEdited ? 'Edited' : 'My Recipe'}</span>
              )}
              <RecipeCardImage cocktail={cocktail} />
              <div className="recipe-card__header">
                <div className="recipe-card__title">
                  <h2>{cocktail.Name}</h2>
                  <RecipeMeta cocktail={cocktail} />
                </div>
                <div className="recipe-card__actions">
                  <button
                    className={favorites.includes(cocktail.id) ? 'icon-button icon-button--favorite' : 'icon-button'}
                    onClick={(event) => toggleFavorite(event, cocktail.id)}
                    aria-label={`Favorite ${cocktail.Name}`}
                  >
                    <Heart size={18} fill={favorites.includes(cocktail.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={(event) => openEditCocktail(event, cocktail)}
                    aria-label={`Edit ${cocktail.Name}`}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className={copiedId === cocktail.id ? 'icon-button icon-button--success' : 'icon-button'}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCopy(cocktail);
                    }}
                    aria-label={`Copy ${cocktail.Name}`}
                  >
                    {copiedId === cocktail.id ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              <div className="recipe-card__body">
                <div>
                  <h3>Ingredients</h3>
                  <ul>
                    {splitIngredients(cocktail.Ingredients).map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
                <div className="method-block">
                  <h3>Method</h3>
                  <p>{cocktail.Method}</p>
                </div>
              </div>
            </article>
          ))}

          {filteredCocktails.length === 0 && (
            <div className="empty-state">
              <GlassWater size={44} />
              <p>No recipes found for “{searchQuery}”.</p>
              <button className="text-button" onClick={() => setSearchQuery('')}>
                Clear search
              </button>
            </div>
          )}
        </section>
      </main>

      {isCreatorOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="creator-modal" role="dialog" aria-modal="true" aria-labelledby="creator-title">
            <div className="modal-header">
              <div>
                <h2 id="creator-title">{editingCocktail ? 'Edit Cocktail' : 'Cocktail Creator'}</h2>
                <p>
                  {editingCocktail
                    ? 'Changes save locally in this browser.'
                    : cloudStatus === 'cloud'
                      ? 'New recipes sync to your cloud library.'
                      : 'New recipes save to this browser.'}
                </p>
              </div>
              <button className="icon-button" onClick={resetForm} aria-label="Close creator">
                <X size={20} />
              </button>
            </div>

            <div className={editingCocktail ? 'creator-grid creator-grid--edit' : 'creator-grid'}>
              {!editingCocktail && (
              <section className="ai-panel">
                <div className="section-title">
                  <Wand2 size={19} />
                  <h3>Cocktail Builder</h3>
                </div>
                <div className="builder-stack">
                  <div className="builder-section">
                    <span className="builder-label">Base</span>
                    <div className="builder-base-grid">
                      {BUILDER_BASES.map((base) => (
                        <button
                          key={base}
                          className={builderBase === base ? 'builder-choice builder-choice--active' : 'builder-choice'}
                          onClick={() => setBuilderBase(base)}
                        >
                          <BaseFilterIcon filter={base === 'No alcohol' ? 'Mocktail' : base} />
                          <span>{base}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="builder-section">
                    <span className="builder-label">Flavor profile</span>
                    <select
                      className="builder-select"
                      value={builderProfile}
                      onChange={(event) => setBuilderProfile(event.target.value)}
                    >
                      {BUILDER_PROFILES.map((profile) => (
                        <option key={profile} value={profile}>
                          {profile}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="builder-section">
                    <span className="builder-label">Ingredients</span>
                    <div className="builder-chip-grid">
                      {BUILDER_INGREDIENTS.map((ingredient) => (
                        <button
                          key={ingredient}
                          className={builderIngredients.includes(ingredient) ? 'builder-chip builder-chip--active' : 'builder-chip'}
                          onClick={() => toggleBuilderIngredient(ingredient)}
                        >
                          {builderIngredients.includes(ingredient) && <Check size={14} />}
                          <span>{ingredient}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="builder-notes">
                    <span className="builder-label">Optional direction</span>
                    <textarea
                      rows="2"
                      placeholder="e.g. lower sugar, spicy finish, brunch-friendly, crushed ice..."
                      value={builderNotes}
                      onChange={(event) => setBuilderNotes(event.target.value)}
                    />
                  </label>

                  <button
                    className="secondary-button"
                    disabled={isGenerating || !builderBase || builderIngredients.length === 0}
                    onClick={handleGenerateBuilderRecipe}
                  >
                    {isGenerating ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
                    <span>{isGenerating ? 'Building' : 'Build Cocktail'}</span>
                  </button>
                </div>

                <div className="builder-divider">
                  <span>or</span>
                </div>

                <p>
                  Describe a drink directly and let the current AI provider draft it.
                </p>
                <textarea
                  rows="4"
                  placeholder="A smoky, spicy tequila drink for a summer afternoon..."
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                />
                <button className="secondary-button" disabled={isGenerating || !aiPrompt.trim()} onClick={handleGenerateRecipe}>
                  {isGenerating ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
                  <span>{isGenerating ? 'Mixing' : 'Generate Recipe'}</span>
                </button>
                {aiError && <p className="form-error">{aiError}</p>}
              </section>
              )}

              <form className="recipe-form" id="recipe-form" onSubmit={handleSaveCocktail}>
                <label>
                  <span>Name</span>
                  <input value={newName} onChange={(event) => setNewName(event.target.value)} required />
                </label>
                <label>
                  <span>Ingredients</span>
                  <textarea
                    rows="5"
                    value={newIngredients}
                    onChange={(event) => setNewIngredients(event.target.value)}
                    placeholder="2 oz Bourbon; ¾ oz lemon juice; ½ oz honey syrup"
                    required
                  />
                </label>
                <label>
                  <span>Method</span>
                  <textarea
                    rows="4"
                    value={newMethod}
                    onChange={(event) => setNewMethod(event.target.value)}
                    placeholder="Shake with ice. Strain over a large cube."
                    required
                  />
                </label>
                <div className="form-pair">
                  <label>
                    <span>Glass type</span>
                    <input
                      value={newGlass}
                      onChange={(event) => setNewGlass(event.target.value)}
                      placeholder="Auto-filled if blank"
                    />
                  </label>
                  <label>
                    <span>Flavor profile</span>
                    <input
                      value={newFlavorProfile}
                      onChange={(event) => setNewFlavorProfile(event.target.value)}
                      placeholder="Auto-filled if blank"
                    />
                  </label>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button className="ghost-button" onClick={resetForm}>
                Cancel
              </button>
              <button className="primary-button" type="submit" form="recipe-form" disabled={isSaving}>
                {isSaving && <Loader2 className="spin" size={18} />}
                <span>{editingCocktail ? 'Save Changes' : 'Save Recipe'}</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedCocktail && (
        <MixingModal
          cocktail={selectedCocktail}
          checkedIngredients={checkedIngredients}
          copiedId={copiedId}
          cocktailImage={cocktailImage}
          favorites={favorites}
          placeholderImageSrc={getPlaceholderImageSrc(selectedCocktail)}
          placeholderLabel={getPlaceholderLabel(selectedCocktail)}
          imageError={imageError}
          imageStatus={imageStatus}
          isGeneratingImage={isGeneratingImage}
          onCheck={setCheckedIngredients}
          onClose={closeMixingMode}
          onCancelImage={handleCancelImageGeneration}
          onCopy={handleCopy}
          onEdit={(event) => openEditCocktail(event, selectedCocktail)}
          onFavorite={toggleFavorite}
          onGenerateImage={() => handleGenerateCocktailImage(selectedCocktail)}
        />
      )}
    </div>
  );
}

function MixingModal({
  cocktail,
  cocktailImage,
  checkedIngredients,
  copiedId,
  favorites,
  placeholderImageSrc,
  placeholderLabel,
  imageError,
  imageStatus,
  isGeneratingImage,
  onCheck,
  onCancelImage,
  onClose,
  onCopy,
  onEdit,
  onFavorite,
  onGenerateImage,
}) {
  const ingredients = splitIngredients(cocktail.Ingredients);
  const complete = checkedIngredients.length === ingredients.length;
  const generatedImageSrc = useImageSource(cocktailImage);
  const displayImageSrc = generatedImageSrc || placeholderImageSrc;
  const imageAlt = cocktailImage
    ? `${cocktail.Name} generated by Nano Banana`
    : `${placeholderLabel} cocktail placeholder`;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="mix-modal" role="dialog" aria-modal="true" aria-labelledby="mix-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header mix-header">
          <div>
            <div className="mix-title-row">
              <h2 id="mix-title">{cocktail.Name}</h2>
              <button
                className={favorites.includes(cocktail.id) ? 'icon-button icon-button--favorite' : 'icon-button'}
                onClick={(event) => onFavorite(event, cocktail.id)}
                aria-label={`Favorite ${cocktail.Name}`}
              >
                <Heart size={21} fill={favorites.includes(cocktail.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <p>Interactive mixing mode</p>
            <RecipeMeta cocktail={cocktail} variant="modal" />
          </div>
          <div className="modal-header__actions">
            <button className="icon-button" onClick={onEdit} aria-label="Edit recipe">
              <Pencil size={18} />
            </button>
            <button className={copiedId === cocktail.id ? 'icon-button icon-button--success' : 'icon-button'} onClick={() => onCopy(cocktail)} aria-label="Copy recipe">
              {copiedId === cocktail.id ? <Check size={19} /> : <Copy size={19} />}
            </button>
            <button className="icon-button" onClick={onClose} aria-label="Close mixing mode">
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="mix-grid">
          <section className="image-panel">
            <div className="section-title section-title--muted">
              <ImageIcon size={17} />
              <h3>Image</h3>
            </div>
            <div
              className={
                `cocktail-image-frame ${cocktailImage ? '' : 'cocktail-image-frame--holding'}`
              }
            >
              <img src={displayImageSrc} alt={imageAlt} />
              {!cocktailImage && (
                <span className="holding-label">
                  {isGeneratingImage ? imageStatus || 'Creating recipe image' : `${placeholderLabel} placeholder`}
                </span>
              )}
            </div>
            {imageStatus && <p className="image-status">{imageStatus}</p>}
            {imageError && <p className="image-error">{imageError}</p>}
            <button
              className={isGeneratingImage ? 'ghost-button image-action image-action--cancel' : 'secondary-button image-action'}
              onClick={isGeneratingImage ? onCancelImage : onGenerateImage}
            >
              {isGeneratingImage ? <X size={18} /> : <RefreshCw size={18} />}
              <span>{isGeneratingImage ? 'Cancel' : cocktailImage ? 'Regenerate' : 'Generate Image'}</span>
            </button>
          </section>

          <section>
            <div className="section-title section-title--muted">
              <CheckCircle2 size={17} />
              <h3>Checklist</h3>
            </div>
            <div className="checklist">
              {ingredients.map((ingredient, index) => {
                const checked = checkedIngredients.includes(index);
                return (
                  <button
                    key={ingredient}
                    className={checked ? 'check-item check-item--checked' : 'check-item'}
                    onClick={() =>
                      onCheck((current) =>
                        current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
                      )
                    }
                  >
                    {checked ? <CheckCircle2 size={21} /> : <Circle size={21} />}
                    <span>{ingredient}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="section-title section-title--muted">
              <GlassWater size={17} />
              <h3>Method</h3>
            </div>
            <div className="mix-method">{cocktail.Method}</div>
            <div className="progress-area">
              <div className="progress-label">
                <span>Progress</span>
                <strong>
                  {checkedIngredients.length} / {ingredients.length}
                </strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${(checkedIngredients.length / ingredients.length) * 100}%` }} />
              </div>
              {complete && <p className="ready-message">Ready to mix. Cheers.</p>}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function RecipeMeta({ cocktail, variant = 'card' }) {
  return (
    <div className={variant === 'modal' ? 'recipe-meta recipe-meta--modal' : 'recipe-meta'} aria-label="Recipe details">
      <span className="recipe-meta__item">
        <GlassTypeIcon glass={cocktail.Glass} />
        <span>{cocktail.Glass || 'Rocks glass'}</span>
      </span>
      <span className="recipe-meta__item">
        <FlavorProfileIcon />
        <span>{cocktail.FlavorProfile || 'Balanced'}</span>
      </span>
    </div>
  );
}

function RecipeCardImage({ cocktail }) {
  const [imageRecord, setImageRecord] = useState(null);
  const generatedImageSrc = useImageSource(imageRecord);
  const displayImageSrc = generatedImageSrc || getPlaceholderImageSrc(cocktail);
  const label = generatedImageSrc ? `${cocktail.Name} generated cocktail image` : `${getPlaceholderLabel(cocktail)} cocktail placeholder`;

  useEffect(() => {
    let cancelled = false;

    setImageRecord(null);
    getCocktailImage(cocktail.id)
      .then((savedImage) => {
        if (!cancelled) setImageRecord(savedImage || null);
      })
      .catch((error) => {
        if (!cancelled) console.warn('Could not load card image.', error);
      });

    return () => {
      cancelled = true;
    };
  }, [cocktail.id]);

  return (
    <div className={generatedImageSrc ? 'recipe-card__image' : 'recipe-card__image recipe-card__image--placeholder'}>
      <img src={displayImageSrc} alt={label} loading="lazy" />
      {!generatedImageSrc && <span>{getPlaceholderLabel(cocktail)}</span>}
    </div>
  );
}

function GlassTypeIcon({ glass }) {
  const normalizedGlass = (glass || '').toLowerCase();

  if (normalizedGlass.includes('flute')) {
    return (
      <svg className="meta-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6v6.5c0 2-1.1 3.7-3 4.2-1.9-.5-3-2.2-3-4.2V3Z" />
        <path d="M12 13.7V20" />
        <path d="M8.5 20h7" />
      </svg>
    );
  }

  if (normalizedGlass.includes('coupe') || normalizedGlass.includes('martini')) {
    return (
      <svg className="meta-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h14l-7 7.8L5 4Z" />
        <path d="M12 11.8V20" />
        <path d="M8 20h8" />
      </svg>
    );
  }

  if (normalizedGlass.includes('wine')) {
    return (
      <svg className="meta-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 3h7v6.4c0 2.3-1.4 4.1-3.5 4.1s-3.5-1.8-3.5-4.1V3Z" />
        <path d="M12 13.5V20" />
        <path d="M8.5 20h7" />
      </svg>
    );
  }

  if (normalizedGlass.includes('mug') || normalizedGlass.includes('julep')) {
    return (
      <svg className="meta-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6h9v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6Z" />
        <path d="M16 8h2.2a2.3 2.3 0 0 1 0 4.6H16" />
        <path d="M8.5 4h6" />
      </svg>
    );
  }

  if (normalizedGlass.includes('highball') || normalizedGlass.includes('collins')) {
    return (
      <svg className="meta-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3h8l-1 18H9L8 3Z" />
        <path d="M9 8h6" />
      </svg>
    );
  }

  return (
    <svg className="meta-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10l-1.2 12H8.2L7 7Z" />
      <path d="M8 7l1-3h6l1 3" />
      <path d="M8.6 12h6.8" />
    </svg>
  );
}

function FlavorProfileIcon() {
  return (
    <svg className="meta-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l1.6 4.5L18 9.1l-4.4 1.6L12 15l-1.6-4.3L6 9.1l4.4-1.6L12 3Z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
    </svg>
  );
}

function BaseFilterIcon({ filter }) {
  const type = filter.toLowerCase();

  return (
    <svg className={`filter-svg filter-svg--${type}`} viewBox="0 0 24 24" aria-hidden="true">
      {type === 'all' && (
        <>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="8" r="3" />
          <circle cx="8" cy="16" r="3" />
          <circle cx="16" cy="16" r="3" />
        </>
      )}
      {(type === 'bourbon' || type === 'rye') && (
        <>
          <path d="M7 7h10l-1.2 12H8.2L7 7Z" />
          <path d="M8 7l1-3h6l1 3" />
          <path d="M8.6 12h6.8" />
        </>
      )}
      {type === 'gin' && (
        <>
          <path d="M8 3h8l-1 18H9L8 3Z" />
          <path d="M9 8h6" />
          <path d="M16 5l2-2" />
        </>
      )}
      {type === 'vodka' && (
        <>
          <path d="M10 3h4v4l2 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-2V3Z" />
          <path d="M9 13h6" />
        </>
      )}
      {type === 'tequila' && (
        <>
          <path d="M5 4h14l-7 7.8L5 4Z" />
          <path d="M12 11.8V20" />
          <path d="M8 20h8" />
        </>
      )}
      {type === 'rum' && (
        <>
          <path d="M8 5h8l1 14H7L8 5Z" />
          <path d="M7.5 10h9" />
          <path d="M15 4l2-2" />
        </>
      )}
      {type === 'wine' && (
        <>
          <path d="M8.5 3h7v6.4c0 2.3-1.4 4.1-3.5 4.1s-3.5-1.8-3.5-4.1V3Z" />
          <path d="M12 13.5V20" />
          <path d="M8.5 20h7" />
        </>
      )}
      {type === 'mocktail' && (
        <>
          <path d="M8 3h8l-1 18H9L8 3Z" />
          <path d="M9 9h6" />
          <path d="M16 4l3-2" />
        </>
      )}
    </svg>
  );
}

function useImageSource(imageRecord) {
  const [imageSource, setImageSource] = useState('');

  useEffect(() => {
    if (!imageRecord) {
      setImageSource('');
      return undefined;
    }

    if (imageRecord.dataUrl) {
      setImageSource(imageRecord.dataUrl);
      return undefined;
    }

    if (!imageRecord.blob) {
      setImageSource('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(imageRecord.blob);
    setImageSource(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageRecord]);

  return imageSource;
}

function getImageGenerationErrorMessage(error) {
  if (error?.name === 'AbortError') {
    return 'Nano Banana took too long or was cancelled. Try again in a moment.';
  }

  if (error?.status === 503) {
    return 'Nano Banana is busy right now. Try again in a minute.';
  }

  if (error?.status === 429) {
    return 'Gemini is rate limiting image generation. Wait a bit, then try again.';
  }

  if (error?.status === 400 || error?.status === 404) {
    return 'The Gemini image model name or request was rejected. Check VITE_GEMINI_IMAGE_MODEL.';
  }

  if (error?.status === 401 || error?.status === 403) {
    return 'The Gemini key does not have access to this image model.';
  }

  return 'Image generation failed. Check your Gemini key, image model, and API access.';
}

function getPlaceholderImageSrc(cocktail) {
  return PLACEHOLDER_IMAGES[getBaseType(cocktail)] || PLACEHOLDER_IMAGES.generic;
}

function getPlaceholderLabel(cocktail) {
  const baseType = getBaseType(cocktail);
  return baseType.charAt(0).toUpperCase() + baseType.slice(1);
}

function getBaseType(cocktail) {
  const ingredients = cocktail?.Ingredients?.toLowerCase() || '';

  if (ingredients.includes('bourbon')) return 'bourbon';
  if (ingredients.includes('rye')) return 'rye';
  if (ingredients.includes('gin')) return 'gin';
  if (ingredients.includes('vodka')) return 'vodka';
  if (ingredients.includes('tequila') || ingredients.includes('mezcal')) return 'tequila';
  if (ingredients.includes('rum')) return 'rum';
  if (['rosé', 'chardonnay', 'chianti', 'blend', 'sparkling', 'wine', 'prosecco', 'champagne'].some((term) => ingredients.includes(term))) {
    return 'wine';
  }
  if (!['campari', 'aperol', 'vermouth', 'liqueur', 'absinthe', 'scotch'].some((term) => ingredients.includes(term))) {
    return 'mocktail';
  }

  return 'generic';
}

function sortCocktails(cocktails, sortBy) {
  const sortedCocktails = [...cocktails];
  const originalOrder = (cocktail) => cocktail.sortIndex ?? 0;
  const compareText = (left, right, getValue) =>
    getValue(left).localeCompare(getValue(right), undefined, { sensitivity: 'base' }) || originalOrder(left) - originalOrder(right);

  if (sortBy === 'name') {
    return sortedCocktails.sort((left, right) => compareText(left, right, (cocktail) => cocktail.Name || ''));
  }

  if (sortBy === 'base') {
    return sortedCocktails.sort((left, right) => {
      const leftBase = getBaseType(left);
      const rightBase = getBaseType(right);
      const baseDelta = BASE_SORT_ORDER.indexOf(leftBase) - BASE_SORT_ORDER.indexOf(rightBase);
      return baseDelta || compareText(left, right, (cocktail) => cocktail.Name || '');
    });
  }

  if (sortBy === 'glass') {
    return sortedCocktails.sort((left, right) => compareText(left, right, (cocktail) => cocktail.Glass || ''));
  }

  if (sortBy === 'flavor') {
    return sortedCocktails.sort((left, right) => compareText(left, right, (cocktail) => cocktail.FlavorProfile || ''));
  }

  if (sortBy === 'newest') {
    return sortedCocktails.sort((left, right) => {
      const dateDelta = new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      return dateDelta || originalOrder(left) - originalOrder(right);
    });
  }

  return sortedCocktails.sort((left, right) => originalOrder(left) - originalOrder(right));
}

function filterMatches(filter, ingredients) {
  if (filter === 'All') return true;
  if (filter === 'Bourbon') return ingredients.includes('bourbon');
  if (filter === 'Rye') return ingredients.includes('rye');
  if (filter === 'Gin') return ingredients.includes('gin');
  if (filter === 'Vodka') return ingredients.includes('vodka');
  if (filter === 'Tequila') return ingredients.includes('tequila') || ingredients.includes('mezcal');
  if (filter === 'Rum') return ingredients.includes('rum');
  if (filter === 'Wine') {
    return ['rosé', 'chardonnay', 'chianti', 'blend', 'sparkling', 'wine', 'prosecco', 'champagne'].some((term) =>
      ingredients.includes(term),
    );
  }
  if (filter === 'Mocktail') {
    return ![
      'bourbon',
      'rye',
      'gin',
      'vodka',
      'tequila',
      'mezcal',
      'rum',
      'rosé',
      'chardonnay',
      'chianti',
      'blend',
      'sparkling wine',
      'campari',
      'aperol',
      'vermouth',
      'liqueur',
      'absinthe',
      'prosecco',
      'champagne',
      'scotch',
    ].some((term) => ingredients.includes(term));
  }
  return true;
}

function normalizeIngredients(value) {
  return value
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join('; ');
}

function splitIngredients(value) {
  return value
    .split(';')
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}
