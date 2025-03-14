import { Gridicon, Suggestions, Spinner } from '@automattic/components';
import { Button } from '@wordpress/components';
import classnames from 'classnames';
import { useTranslate } from 'i18n-calypso';
import { FC, useMemo, useRef, useState } from 'react';
import FormTextInput from 'calypso/components/forms/form-text-input';
import type { Vertical } from './types';
import './style.scss';

interface Props {
	placeholder?: string;
	searchTerm: string;
	suggestions: Vertical[];
	isDisableInput?: boolean | undefined;
	isLoading?: boolean | undefined;
	onInputChange?: ( value: string ) => void;
	onSelect?: ( vertical: Vertical ) => void;
}

const SelectVerticalSuggestionSearch: FC< Props > = ( {
	placeholder,
	searchTerm,
	suggestions,
	isDisableInput,
	isLoading,
	onInputChange,
	onSelect,
} ) => {
	const [ isShowSuggestions, setIsShowSuggestions ] = useState( false );
	const [ isFocused, setIsFocused ] = useState( false );
	const inputRef = useRef( null );
	const suggestionsRef = useRef( null );
	const toggleIconRef = useRef( null );
	const translate = useTranslate();

	const handleTextInputBlur = ( event: React.FocusEvent ) => {
		// Hide the suggestion dropdown unless the focus is moved to the toggle icon.
		if ( event && event.relatedTarget?.contains( toggleIconRef.current ) ) {
			return;
		}

		setIsShowSuggestions( false );
		setIsFocused( false );
	};

	const handleTextInputFocus = () => {
		setIsShowSuggestions( true );
		setIsFocused( true );
	};

	const handleTextInputChange = ( event: React.ChangeEvent< HTMLInputElement > ) => {
		// Reset the vertical selection if input field is empty.
		// This is so users don't need to explicitly select "Something else" to clear previous selection.
		if ( event.target.value.trim().length === 0 ) {
			onSelect?.( { value: '', label: '' } );
		}

		setIsShowSuggestions( true );
		onInputChange?.( event.target.value );
	};

	const handleToggleSuggestionsBlur = ( event: React.FocusEvent ) => {
		// Hide the suggestion dropdown unless the focus is moved to the input field.
		if ( event && event.relatedTarget?.contains( inputRef.current ) ) {
			return;
		}

		setIsShowSuggestions( false );
		setIsFocused( false );
	};

	const handleToggleSuggestionsClick = () => {
		if ( isDisableInput ) {
			return;
		}

		setIsShowSuggestions( ! isShowSuggestions );
	};

	const handleToggleSuggestionsKeyDown = ( event: React.KeyboardEvent< HTMLButtonElement > ) => {
		if ( event.key === 'Escape' || event.key === 'Tab' ) {
			setIsShowSuggestions( false );
		}
	};

	const handleTextInputKeyDown = ( event: KeyboardEvent ) => {
		if ( event.key === 'Enter' && isShowSuggestions ) {
			event.preventDefault();
		}

		if ( event.key === 'Escape' ) {
			setIsShowSuggestions( false );
		}

		if ( suggestionsRef.current ) {
			( suggestionsRef.current as Suggestions ).handleKeyEvent( event );
		}
	};

	const handleSuggestionsSelect = ( { label, value }: { label: string; value?: string } ) => {
		setIsShowSuggestions( false );
		onSelect?.( { label, value } as Vertical );
	};

	const getSuggestions = useMemo( () => {
		if ( isLoading || ! isShowSuggestions ) {
			return [];
		}

		if ( searchTerm === '' ) {
			return suggestions || [];
		}

		return suggestions.concat( [
			{
				value: '',
				label: String( translate( 'Something else' ) ),
				category: 0 < suggestions.length ? '—' : '',
			},
		] );
	}, [ translate, searchTerm, suggestions, isLoading, isShowSuggestions ] );

	return (
		<div
			className={ classnames( 'select-vertical__suggestion-search', {
				'is-focused': isFocused,
				'is-show-suggestions': isShowSuggestions && ! isLoading,
			} ) }
			aria-expanded={ isShowSuggestions }
		>
			<div className="select-vertical__suggestion-input">
				{ isLoading && isShowSuggestions && <Spinner /> }
				<FormTextInput
					inputRef={ inputRef }
					value={ searchTerm }
					placeholder={ placeholder }
					disabled={ isDisableInput }
					onBlur={ handleTextInputBlur }
					onFocus={ handleTextInputFocus }
					onChange={ handleTextInputChange }
					onKeyDown={ handleTextInputKeyDown }
					autoComplete="off"
				/>
				<Button
					ref={ toggleIconRef }
					onFocus={ () => setIsFocused( true ) }
					onBlur={ handleToggleSuggestionsBlur }
					onClick={ handleToggleSuggestionsClick }
					onKeyDown={ handleToggleSuggestionsKeyDown }
				>
					<Gridicon size={ 18 } icon="chevron-down" />
				</Button>
			</div>
			<Suggestions
				className="select-vertical__suggestion-search-dropdown"
				ref={ suggestionsRef }
				title=""
				query={ searchTerm }
				suggestions={ getSuggestions }
				suggest={ handleSuggestionsSelect }
			/>
		</div>
	);
};

export default SelectVerticalSuggestionSearch;
