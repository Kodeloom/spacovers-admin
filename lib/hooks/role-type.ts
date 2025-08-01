/******************************************************************************
 * This file was generated by ZenStack CLI.
 ******************************************************************************/

/* eslint-disable */
// @ts-nocheck

import type { Prisma, RoleType } from "@prisma-app/client";
import type { UseMutationOptions, UseQueryOptions, UseInfiniteQueryOptions, InfiniteData } from '@tanstack/vue-query';
import { getHooksContext } from '@zenstackhq/tanstack-query/runtime-v5/vue';
import type { MaybeRefOrGetter, ComputedRef, UnwrapRef } from 'vue';
import { useModelQuery, useInfiniteModelQuery, useModelMutation } from '@zenstackhq/tanstack-query/runtime-v5/vue';
import type { PickEnumerable, CheckSelect, QueryError, ExtraQueryOptions, ExtraMutationOptions } from '@zenstackhq/tanstack-query/runtime-v5';
import type { PolicyCrudKind } from '@zenstackhq/runtime'
import metadata from './__model_meta';
type DefaultError = QueryError;

export function useCreateRoleType(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeCreateArgs, unknown>> | ComputedRef<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeCreateArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.RoleTypeCreateArgs, DefaultError, RoleType, true>('RoleType', 'POST', `${endpoint}/roleType/create`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.RoleTypeCreateArgs>(
            args: Prisma.SelectSubset<T, Prisma.RoleTypeCreateArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeCreateArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeCreateArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useCreateManyRoleType(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.RoleTypeCreateManyArgs, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.RoleTypeCreateManyArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.RoleTypeCreateManyArgs, DefaultError, Prisma.BatchPayload, false>('RoleType', 'POST', `${endpoint}/roleType/createMany`, metadata, options, fetch, false)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.RoleTypeCreateManyArgs>(
            args: Prisma.SelectSubset<T, Prisma.RoleTypeCreateManyArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeCreateManyArgs>, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeCreateManyArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as Prisma.BatchPayload;
        },
    };
    return mutation;
}

export function useFindManyRoleType<TArgs extends Prisma.RoleTypeFindManyArgs, TQueryFnData = Array<Prisma.RoleTypeGetPayload<TArgs> & { $optimistic?: boolean }>, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindManyArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindManyArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('RoleType', `${endpoint}/roleType/findMany`, args, options, fetch);
}

export function useInfiniteFindManyRoleType<TArgs extends Prisma.RoleTypeFindManyArgs, TQueryFnData = Array<Prisma.RoleTypeGetPayload<TArgs>>, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindManyArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindManyArgs>>, options?: MaybeRefOrGetter<Omit<UseInfiniteQueryOptions<TQueryFnData, TError, InfiniteData<TData>>, 'queryKey' | 'initialPageParam'>> | ComputedRef<Omit<UseInfiniteQueryOptions<TQueryFnData, TError, InfiniteData<TData>>, 'queryKey' | 'initialPageParam'>>) {
    const { endpoint, fetch } = getHooksContext();
    return useInfiniteModelQuery<TQueryFnData, TData, TError>('RoleType', `${endpoint}/roleType/findMany`, args, options, fetch);
}

export function useFindUniqueRoleType<TArgs extends Prisma.RoleTypeFindUniqueArgs, TQueryFnData = Prisma.RoleTypeGetPayload<TArgs> & { $optimistic?: boolean }, TData = TQueryFnData, TError = DefaultError>(args: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindUniqueArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindUniqueArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('RoleType', `${endpoint}/roleType/findUnique`, args, options, fetch);
}

export function useFindFirstRoleType<TArgs extends Prisma.RoleTypeFindFirstArgs, TQueryFnData = Prisma.RoleTypeGetPayload<TArgs> & { $optimistic?: boolean }, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindFirstArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.RoleTypeFindFirstArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('RoleType', `${endpoint}/roleType/findFirst`, args, options, fetch);
}

export function useUpdateRoleType(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeUpdateArgs, unknown>> | ComputedRef<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeUpdateArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.RoleTypeUpdateArgs, DefaultError, RoleType, true>('RoleType', 'PUT', `${endpoint}/roleType/update`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.RoleTypeUpdateArgs>(
            args: Prisma.SelectSubset<T, Prisma.RoleTypeUpdateArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeUpdateArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeUpdateArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useUpdateManyRoleType(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.RoleTypeUpdateManyArgs, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.RoleTypeUpdateManyArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.RoleTypeUpdateManyArgs, DefaultError, Prisma.BatchPayload, false>('RoleType', 'PUT', `${endpoint}/roleType/updateMany`, metadata, options, fetch, false)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.RoleTypeUpdateManyArgs>(
            args: Prisma.SelectSubset<T, Prisma.RoleTypeUpdateManyArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeUpdateManyArgs>, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeUpdateManyArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as Prisma.BatchPayload;
        },
    };
    return mutation;
}

export function useUpsertRoleType(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeUpsertArgs, unknown>> | ComputedRef<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeUpsertArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.RoleTypeUpsertArgs, DefaultError, RoleType, true>('RoleType', 'POST', `${endpoint}/roleType/upsert`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.RoleTypeUpsertArgs>(
            args: Prisma.SelectSubset<T, Prisma.RoleTypeUpsertArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeUpsertArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeUpsertArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useDeleteRoleType(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeDeleteArgs, unknown>> | ComputedRef<UseMutationOptions<(RoleType | undefined), DefaultError, Prisma.RoleTypeDeleteArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.RoleTypeDeleteArgs, DefaultError, RoleType, true>('RoleType', 'DELETE', `${endpoint}/roleType/delete`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.RoleTypeDeleteArgs>(
            args: Prisma.SelectSubset<T, Prisma.RoleTypeDeleteArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeDeleteArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeDeleteArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, RoleType, Prisma.RoleTypeGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useDeleteManyRoleType(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.RoleTypeDeleteManyArgs, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.RoleTypeDeleteManyArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.RoleTypeDeleteManyArgs, DefaultError, Prisma.BatchPayload, false>('RoleType', 'DELETE', `${endpoint}/roleType/deleteMany`, metadata, options, fetch, false)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.RoleTypeDeleteManyArgs>(
            args: Prisma.SelectSubset<T, Prisma.RoleTypeDeleteManyArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeDeleteManyArgs>, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.RoleTypeDeleteManyArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as Prisma.BatchPayload;
        },
    };
    return mutation;
}

export function useAggregateRoleType<TArgs extends Prisma.RoleTypeAggregateArgs, TQueryFnData = Prisma.GetRoleTypeAggregateType<TArgs>, TData = TQueryFnData, TError = DefaultError>(args: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.RoleTypeAggregateArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.RoleTypeAggregateArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('RoleType', `${endpoint}/roleType/aggregate`, args, options, fetch);
}

export function useGroupByRoleType<TArgs extends Prisma.RoleTypeGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<TArgs>>, Prisma.Extends<'take', Prisma.Keys<TArgs>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? { orderBy: Prisma.RoleTypeGroupByArgs['orderBy'] } : { orderBy?: Prisma.RoleTypeGroupByArgs['orderBy'] }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<TArgs['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<TArgs['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<TArgs['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends TArgs['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True
    ? `Error: "by" must not be empty.`
    : HavingValid extends Prisma.False
    ? {
        [P in HavingFields]: P extends ByFields
        ? never
        : P extends string
        ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
        : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`,
        ]
    }[HavingFields]
    : 'take' extends Prisma.Keys<TArgs>
    ? 'orderBy' extends Prisma.Keys<TArgs>
    ? ByValid extends Prisma.True
    ? {}
    : {
        [P in OrderFields]: P extends ByFields
        ? never
        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
    }[OrderFields]
    : 'Error: If you provide "take", you also need to provide "orderBy"'
    : 'skip' extends Prisma.Keys<TArgs>
    ? 'orderBy' extends Prisma.Keys<TArgs>
    ? ByValid extends Prisma.True
    ? {}
    : {
        [P in OrderFields]: P extends ByFields
        ? never
        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
    }[OrderFields]
    : 'Error: If you provide "skip", you also need to provide "orderBy"'
    : ByValid extends Prisma.True
    ? {}
    : {
        [P in OrderFields]: P extends ByFields
        ? never
        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
    }[OrderFields], TQueryFnData = {} extends InputErrors ?
    Array<PickEnumerable<Prisma.RoleTypeGroupByOutputType, TArgs['by']> &
        {
            [P in ((keyof TArgs) & (keyof Prisma.RoleTypeGroupByOutputType))]: P extends '_count'
            ? TArgs[P] extends boolean
            ? number
            : Prisma.GetScalarType<TArgs[P], Prisma.RoleTypeGroupByOutputType[P]>
            : Prisma.GetScalarType<TArgs[P], Prisma.RoleTypeGroupByOutputType[P]>
        }
    > : InputErrors, TData = TQueryFnData, TError = DefaultError>(args: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.SubsetIntersection<TArgs, Prisma.RoleTypeGroupByArgs, OrderByArg> & InputErrors>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.SubsetIntersection<TArgs, Prisma.RoleTypeGroupByArgs, OrderByArg> & InputErrors>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('RoleType', `${endpoint}/roleType/groupBy`, args, options, fetch);
}

export function useCountRoleType<TArgs extends Prisma.RoleTypeCountArgs, TQueryFnData = TArgs extends { select: any; } ? TArgs['select'] extends true ? number : Prisma.GetScalarType<TArgs['select'], Prisma.RoleTypeCountAggregateOutputType> : number, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.RoleTypeCountArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.RoleTypeCountArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('RoleType', `${endpoint}/roleType/count`, args, options, fetch);
}

export function useCheckRoleType<TError = DefaultError>(args: { operation: PolicyCrudKind; where?: { id?: string; name?: string; description?: string; color?: string; canUseStations?: boolean; isSystem?: boolean; displayOrder?: number }; }, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<boolean, TError, boolean>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<boolean, TError, boolean>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<boolean, boolean, TError>('RoleType', `${endpoint}/roleType/check`, args, options, fetch);
}
