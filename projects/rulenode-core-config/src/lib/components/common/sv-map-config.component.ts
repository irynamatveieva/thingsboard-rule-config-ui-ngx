import { Component, forwardRef, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormArray,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  NgControl,
  FormBuilder,
  FormControl,
  FormGroup,
  Validator,
  Validators
} from '@angular/forms';
import { PageComponent } from '@shared/public-api';
import { Store } from '@ngrx/store';
import { AppState, isDefinedAndNotNull } from '@core/public-api';
import { Subject, Subscription } from 'rxjs';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { TranslateService } from '@ngx-translate/core';
import { takeUntil } from 'rxjs/operators';
import { OriginatorFields } from '../../rulenode-core-config.models';

@Component({
  selector: 'tb-sv-map-config',
  templateUrl: './sv-map-config.component.html',
  styleUrls: ['./sv-map-config.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SvMapConfigComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => SvMapConfigComponent),
      multi: true,
    }
  ]
})
export class SvMapConfigComponent extends PageComponent implements ControlValueAccessor, OnInit, Validator, OnDestroy {

  private _disabled: boolean;
  private destroy$ = new Subject<void>();
  private requiredValue: boolean;
  private sourceFieldSubcritption: Subscription[] = [];
  private propagateChange = null;
  private valueChangeSubscription: Subscription = null;

  svListFormGroup: FormGroup;
  ngControl: NgControl;

  @Input() selectOptions: string[];

  @Input() selectOptionsTranslate: Map<OriginatorFields, string>;

  @Input()
  set disabled(value) {
    this._disabled = coerceBooleanProperty(value);
  }
  get disabled() {
    return this._disabled;
  }

  @Input() labelText: string;

  @Input() requiredText: string;

  @Input() targetKeyPrefix: string;

  @Input() selectText: string;

  @Input() selectRequiredText: string;

  @Input() valText: string;

  @Input() valRequiredText: string;

  @Input() hintText: string;

  @Input() popupHelpLink: string;

  get required(): boolean {
    return this.requiredValue;
  }
  @Input()
  set required(value: boolean) {
    this.requiredValue = coerceBooleanProperty(value);
  }

  constructor(protected store: Store<AppState>,
              public translate: TranslateService,
              public injector: Injector,
              private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.ngControl = this.injector.get(NgControl);
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
    this.svListFormGroup = this.fb.group({});
    this.svListFormGroup.addControl('keyVals',
      this.fb.array([]));
  }

  keyValsFormArray(): FormArray {
    return this.svListFormGroup.get('keyVals') as FormArray;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.disabled) {
      this.svListFormGroup.disable({emitEvent: false});
    } else {
      this.svListFormGroup.enable({emitEvent: false});
    }
  }

  writeValue(keyValMap: {[key: string]: string}): void {
    if (this.valueChangeSubscription) {
      this.valueChangeSubscription.unsubscribe();
    }
    const keyValsControls: Array<AbstractControl> = [];
    if (keyValMap) {
      for (const property of Object.keys(keyValMap)) {
        if (Object.prototype.hasOwnProperty.call(keyValMap, property)) {
          keyValsControls.push(this.fb.group({
            key: [property, [Validators.required]],
            value: [keyValMap[property], [Validators.required, Validators.pattern(/(?:.|\s)*\S(&:.|\s)*/)]]
          }));
        }
      }
    }
    this.svListFormGroup.setControl('keyVals', this.fb.array(keyValsControls));
    for (const formGroup of this.keyValsFormArray().controls) {
      this.keyChangeSubscribe(formGroup);
    }
    this.valueChangeSubscription = this.svListFormGroup.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((value) => {
      this.updateModel();
    });
  }

  public filterSelectOptions(keyValControl?) {
    const deleteValueArray = [];
    for (const fieldMap of this.svListFormGroup.get('keyVals').value) {
      deleteValueArray.push(this.selectOptions.find((value) => value === fieldMap.key));
    }

    const filterSelectOptions = [];
    for (const selectOption of this.selectOptions) {
      if (!isDefinedAndNotNull(deleteValueArray.find((deleteValue) => deleteValue === selectOption)) ||
        selectOption === keyValControl?.get('key').value) {
        filterSelectOptions.push(selectOption);
      }
    }

    return filterSelectOptions;
  }

  public removeKeyVal(index: number) {
    (this.svListFormGroup.get('keyVals') as FormArray).removeAt(index);
    this.sourceFieldSubcritption[index].unsubscribe();
    this.sourceFieldSubcritption.splice(index, 1);
  }

  public addKeyVal() {
    const keyValsFormArray = this.svListFormGroup.get('keyVals') as FormArray;
    keyValsFormArray.push(this.fb.group({
      key: ['', [Validators.required]],
      value: ['', [Validators.required, Validators.pattern(/(?:.|\s)*\S(&:.|\s)*/)]]
    }));
    this.keyChangeSubscribe(keyValsFormArray.controls[keyValsFormArray.length - 1]);
  }

  private keyChangeSubscribe(formGroup) {
    this.sourceFieldSubcritption.push(formGroup.get('key').valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((value) => {
      formGroup.get('value').patchValue(this.targetKeyPrefix + value[0].toUpperCase() + value.slice(1));
    }));
  }

  public validate(c: FormControl) {
    const kvList: {key: string; value: string}[] = this.svListFormGroup.get('keyVals').value;
    if (!kvList.length && this.required) {
      return {
        kvMapRequired: true
      };
    }
    if (!this.svListFormGroup.valid) {
      return {
        kvFieldsRequired: true
      };
    }
    return null;
  }

  private updateModel() {
    const kvList: {key: string; value: string}[] = this.svListFormGroup.get('keyVals').value;
    if (this.required && !kvList.length || !this.svListFormGroup.valid) {
      this.propagateChange(null);
    } else {
      const keyValMap: { [key: string]: string } = {};
      kvList.forEach((entry) => {
        keyValMap[entry.key] = entry.value;
      });
      this.propagateChange(keyValMap);
    }
  }
}
