import { Button, Card, Popover, Gridicon } from '@automattic/components';
import { isWithinBreakpoint } from '@automattic/viewport';
import classnames from 'classnames';
import { createRef, Component, Fragment } from 'react';
import FormCheckbox from 'calypso/components/forms/form-checkbox';
import FormLabel from 'calypso/components/forms/form-label';
import MobileSelectPortal from '../mobile-select-portal';

export class TypeSelector extends Component {
	state = {
		userHasSelected: false,
		selectedCheckboxes: [],
	};

	typeButton = createRef();

	resetTypeSelector = ( event ) => {
		const { selectType } = this.props;
		selectType( [] );
		event.preventDefault();
	};

	handleToggleAllTypesSelector = () => {
		const { types } = this.props;
		const selectedCheckboxes = this.getSelectedCheckboxes();
		if ( ! selectedCheckboxes.length ) {
			this.setState( {
				userHasSelected: true,
				selectedCheckboxes: types.map( ( type ) => type.key ),
			} );
		} else {
			this.setState( {
				userHasSelected: true,
				selectedCheckboxes: [],
			} );
		}
	};

	handleSelectClick = ( event ) => {
		const type = event.target.getAttribute( 'id' );

		if ( this.getSelectedCheckboxes().includes( type ) ) {
			this.setState( {
				userHasSelected: true,
				selectedCheckboxes: this.getSelectedCheckboxes().filter( ( ch ) => ch !== type ),
			} );
		} else {
			this.setState( {
				userHasSelected: true,
				selectedCheckboxes: [ ...new Set( this.getSelectedCheckboxes() ).add( type ) ],
			} );
		}
	};

	getSelectedCheckboxes = () => {
		if ( this.state.userHasSelected ) {
			return this.state.selectedCheckboxes;
		}
		const key = this.props.typeKey || 'group';
		if ( this.props.filter?.[ key ]?.length ) {
			return this.props.filter[ key ];
		}
		return [];
	};

	typeKeyToName = ( key ) => {
		const { types } = this.props;
		const match = types.find( ( item ) => item.key === key );
		return match?.name ?? key;
	};

	handleClose = () => {
		const { onClose, selectType } = this.props;

		selectType( this.getSelectedCheckboxes() );
		this.setState( {
			userHasSelected: false,
			selectedCheckboxes: [],
		} );
		onClose();
	};

	humanReadable = ( count ) => {
		if ( count >= 1000 ) {
			return this.props.translate( '%(number_over_thousand)d K+', {
				args: {
					number_over_thousand: Math.floor( ( count / 1000 ) * 10 ) / 10,
				},
			} );
		}
		return count;
	};

	renderCheckbox = ( item ) => {
		return (
			<FormLabel key={ item.key }>
				<FormCheckbox
					id={ item.key }
					checked={ this.isSelected( item.key ) }
					name={ item.key }
					onChange={ this.handleSelectClick }
				/>
				{ item.count ? item.name + ' (' + this.humanReadable( item.count ) + ')' : item.name }
			</FormLabel>
		);
	};

	renderCheckboxSelection = () => {
		const { translate, types } = this.props;
		const selectedCheckboxes = this.getSelectedCheckboxes();

		return (
			<div className="type-selector__activity-types-selection-wrap">
				{ types && !! types.length && (
					<div>
						<Fragment>
							<div className="type-selector__activity-types-selection-granular">
								{ types.map( this.renderCheckbox ) }
							</div>
						</Fragment>
						<div className="type-selector__activity-types-selection-info">
							<div className="type-selector__date-range-info">
								{ selectedCheckboxes.length === 0 && (
									<Button borderless compact onClick={ this.handleToggleAllTypesSelector }>
										{ translate( '{{icon/}} select all', {
											components: { icon: <Gridicon icon="checkmark" /> },
										} ) }
									</Button>
								) }
								{ selectedCheckboxes.length !== 0 && (
									<Button borderless compact onClick={ this.handleToggleAllTypesSelector }>
										{ translate( '{{icon/}} clear', {
											components: { icon: <Gridicon icon="cross-small" /> },
										} ) }
									</Button>
								) }
							</div>
							<Button
								className="type-selector__activity-types-apply"
								primary
								compact
								disabled={ ! this.state.userHasSelected }
								onClick={ this.handleClose }
							>
								{ translate( 'Apply' ) }
							</Button>
						</div>
					</div>
				) }
				{ ! types && [ 1, 2, 3 ].map( this.renderPlaceholder ) }
				{ types && ! types.length && (
					<p>{ translate( 'No activities recorded in the selected date range.' ) }</p>
				) }
			</div>
		);
	};

	renderPlaceholder = ( i ) => {
		return (
			<div
				className="type-selector__activity-types-selection-placeholder"
				key={ 'placeholder' + i }
			/>
		);
	};

	isSelected = ( key ) => this.getSelectedCheckboxes().includes( key );

	handleButtonClick = () => {
		const { isVisible, onButtonClick } = this.props;

		if ( isVisible ) {
			this.handleClose();
		}
		onButtonClick();
	};

	render() {
		const { title, isVisible } = this.props;
		const selectedCheckboxes = this.getSelectedCheckboxes();
		const hasSelectedCheckboxes = selectedCheckboxes.length > 0;

		const buttonClass = classnames( 'filterbar__selection', {
			'is-selected': hasSelectedCheckboxes,
			'is-active': isVisible && ! hasSelectedCheckboxes,
		} );

		return (
			<Fragment>
				<Button
					className={ buttonClass }
					compact
					borderless
					onClick={ this.handleButtonClick }
					ref={ this.typeButton }
				>
					{ title }
					{ hasSelectedCheckboxes && <span>: </span> }
					{ hasSelectedCheckboxes && selectedCheckboxes.map( this.typeKeyToName ).join( ', ' ) }
				</Button>
				{ hasSelectedCheckboxes && (
					<Button
						className="type-selector__selection-close"
						compact
						borderless
						onClick={ this.resetTypeSelector }
					>
						<Gridicon icon="cross-small" />
					</Button>
				) }
				{ isWithinBreakpoint( '>660px' ) && (
					<Popover
						id="filterbar__activity-types"
						isVisible={ isVisible }
						onClose={ this.handleClose }
						position="bottom"
						relativePosition={ { left: -80 } }
						context={ this.typeButton.current }
					>
						{ this.renderCheckboxSelection() }
					</Popover>
				) }
				{ ! isWithinBreakpoint( '>660px' ) && (
					<MobileSelectPortal isVisible={ isVisible }>
						<Card>{ this.renderCheckboxSelection() }</Card>
					</MobileSelectPortal>
				) }
			</Fragment>
		);
	}
}
