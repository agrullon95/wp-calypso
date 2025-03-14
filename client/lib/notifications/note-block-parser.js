import { compact, find } from 'lodash';

/**
 * Comparator function for sorting formatted ranges
 *
 * A range is considered to be before another range if:
 *   - it's a zero-length range and the other isn't
 *   - it starts before the other
 *   - it has the same start but ends before the other
 *
 * @param {object} rangeA                  First range
 * @param {Array}  rangeA.indices          Start and end of the first range
 * @param {number} rangeA.indices.0 aStart Start index of first range
 * @param {number} rangeA.indices.1 aEnd   End index of first range
 * @param {object} rangeB                  Second range
 * @param {Array}  rangeB.indices          Start and end of the second range
 * @param {number} rangeB.indices.0 aStart Start index of second range
 * @param {number} rangeB.indices.1 aEnd   End index of second range
 * @returns {number} -1/0/1 indicating sort order
 */
const rangeSort = ( { indices: [ aStart, aEnd ] }, { indices: [ bStart, bEnd ] } ) => {
	// some "invisible" tokens appear as zero-length ranges
	// at the beginning of certain formatted blocks
	if ( aStart === 0 && aEnd === 0 && bEnd !== 0 ) {
		return -1;
	}

	if ( aStart < bStart ) {
		return -1;
	}

	if ( bStart < aStart ) {
		return 1;
	}

	return bEnd - aEnd;
};

/**
 * Returns a function which will say if another range
 * is "fully contained" within in: if it "encloses"
 *
 * A range is "enclosed" by another range if it falls
 * entirely within the indices of another. Two ranges
 * with the same indices will enclose one another.
 *
 * "inner" is the range under test
 * "outer" is the range that may enclose "inner"
 *
 * The initial "invisible token" ranges are not enclosed
 *
 * @param {object} range                      Range
 * @param {Array}  range.indices              Start and end of the range
 * @param {number} range.indices.0 innerStart Start index of the range
 * @param {number} range.indices.1 innerEnd   End index of the range
 * @returns {Function({indices: Number[]}): boolean} performs the check
 */
const encloses =
	( { indices: [ innerStart, innerEnd ] } ) =>
	/**
	 * Indicates if the given range encloses the first "inner" range
	 *
	 * @param {number} outerStart start of possibly-outer range
	 * @param {number} outerEnd end of possibly-outer range
	 * @returns {boolean} whether the "outer" range encloses the "inner" range
	 */
	( { indices: [ outerStart, outerEnd ] = [ 0, 0 ] } ) =>
		innerStart !== 0 && innerEnd !== 0 && outerStart <= innerStart && outerEnd >= innerEnd;

/**
 * Builds a tree of ranges
 * Converts from list of intervals to tree
 *
 * Formats are given as a list of ranges of attributed text.
 * These ranges may nest within each other. We need to be
 * able to transform from the separated list view into the
 * more meaningful list view.
 *
 * This function take a tree of existing ranges, finds the
 * nearest parent range if available, and inserts the given
 * range into the tree.
 *
 * A range is a parent of another if it "encloses" the range.
 *
 * @param {object[]} ranges the tree of ranges
 * @param {object} range the range to add
 * @returns {object[]} the new tree
 */
const addRange = ( ranges, range ) => {
	const parent = find( ranges, encloses( range ) );

	return parent
		? [ ...ranges.slice( 0, -1 ), { ...parent, children: addRange( parent.children, range ) } ]
		: [ ...ranges, range ];
};

//
// Range type mappings: extract and normalize necessary data from range objects
//

const commentNode = ( { id: commentId, post_id: postId, site_id: siteId } ) => ( {
	type: 'comment',
	commentId,
	postId,
	siteId,
} );

const linkNode = ( { url, intent, section } ) => ( { type: 'link', url, intent, section } );

const postNode = ( { id: postId, site_id: siteId } ) => ( { type: 'post', postId, siteId } );

const siteNode = ( { id: siteId, intent, section } ) => ( {
	type: 'site',
	siteId,
	intent,
	section,
} );

const typedNode = ( { type } ) => ( { type } );

const userNode = ( { id: userId, name, site_id: siteId, intent, section } ) => ( {
	type: 'person',
	name,
	siteId,
	userId,
	intent,
	section,
} );

const pluginNode = ( { site_slug, slug, version, intent, section } ) => ( {
	type: 'plugin',
	siteSlug: site_slug,
	pluginSlug: slug,
	version,
	intent,
	section,
} );

const themeNode = ( { site_slug, slug, version, uri, intent, section } ) => ( {
	type: 'theme',
	siteSlug: site_slug,
	themeSlug: slug,
	themeUri: uri,
	version,
	intent,
	section,
} );

const inferNode = ( range ) => {
	const { type, url } = range;

	if ( url ) {
		return linkNode( range );
	}

	if ( type ) {
		return typedNode( range );
	}

	return range;
};

//
// End of range-type mapping
//

/**
 * Returns function to map range to node
 *
 * @param {string} type type of node specified in range
 * @returns {Function(object): object} maps block to meta data
 */
const nodeMappings = ( type ) => {
	switch ( type ) {
		case 'comment':
			return commentNode;

		case 'post':
			return postNode;

		case 'site':
			return siteNode;

		case 'user':
			return userNode;

		case 'plugin':
			return pluginNode;

		case 'theme':
			return themeNode;

		default:
			return inferNode;
	}
};

/**
 * Creates a node with appropriate properties
 * extracted from text and range information
 *
 * @param {object|string} text original text message
 * @param {object} range contains type and meta information
 * @returns {{children: *[]}} new node
 */
const newNode = ( text, range = {} ) => ( {
	...nodeMappings( range.type )( range ),
	children: [ text ],
} );

/**
 * Reducer to combine ongoing results with new results
 *
 * @param {Array}  results   All results
 * @param {?Array} results.0 Existing results
 * @param {?Array} results.1 New results
 * @returns {Array} combined results
 */
const joinResults = ( [ reduced, remainder ] ) =>
	reduced.length // eslint-disable-line no-nested-ternary
		? compact( reduced.concat( remainder ) )
		: remainder.length
		? [ remainder ]
		: [];

/**
 * Parses a formatted text block into typed nodes
 * Recursive reducer function
 *
 * Note: Although recursive, we don't expect to see
 * large recursion trees here. Most blocks will have
 * on the order of a few ranges at most so there is
 * little fear of overflowing the call stack. If we
 * start parsing more complicated blocks we will need
 * to implement some kind of stack safety here such
 * as the use of a "trampoline".
 *
 * @param {Array}  reducer   Reducer arguments
 * @param {Array}  reducer.0 Previously parsed results
 * @param {string} reducer.1 Remaining text to parse
 * @param {number} reducer.2 Current index into text string
 * @param {object} nextRange Next range from formatted block
 * @returns {Array} parsed results: text and nodes
 */
const parse = ( [ prev, text, offset ], nextRange ) => {
	const {
		indices: [ start, end ],
	} = nextRange;
	const offsetStart = start - offset;
	const offsetEnd = end - offset;

	// Sometimes there's text before the first range
	const preText = offsetStart > 0 ? [ text.slice( 0, offsetStart ) ] : [];

	// recurse into the children of the top-level ranges
	const children = joinResults(
		nextRange.children.reduce( parse, [ [], text.slice( offsetStart, offsetEnd ), start ] )
	);

	const parsed = Object.assign(
		newNode( text.slice( offsetStart, offsetEnd ), nextRange ),
		children.length && { children }
	);

	return [ [ ...prev, ...preText, parsed ], text.slice( offsetEnd ), end ];
};

/**
 * Parses a formatted text block into typed nodes
 *
 * Uses the recursive helper after doing some
 * prep work on the list of block ranges.
 *
 * @see parse
 * @param {object} block the block to parse
 * @returns {Array} list of text and node segments with children
 */
export const parseBlock = ( block ) =>
	block.ranges // is it complex or unformatted text?
		? joinResults(
				block.ranges
					.map( ( o ) => ( { ...o, children: [] } ) )
					.sort( rangeSort )
					.reduce( addRange, [] )
					.reduce( parse, [ [], block.text, 0 ] )
		  )
		: [ newNode( block ) ];
